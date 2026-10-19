// DeepSeek AI 解析层
// 负责：1) 把自然语言一句话解析成 1~N 条结构化记录；2) 生成每日回顾总结
// 使用 DeepSeek OpenAI 兼容接口：https://api.deepseek.com/chat/completions
(function () {
  const ENDPOINT = "https://api.deepseek.com/chat/completions";

  async function callDeepSeek(messages, opts) {
    const cfg = window.Config.get();
    const apiKey = (cfg.apiKey || "").trim();
    if (!apiKey) throw new Error("未配置 DeepSeek API Key，请到「设置」填写。");
    const model = cfg.model || "deepseek-chat";
    const body = {
      model,
      messages,
      temperature: 0.2,
      response_format: { type: "json_object" }
    };
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("DeepSeek 调用失败(" + res.status + "): " + txt.slice(0, 200));
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  // 把一句话解析为记录数组
  async function parseSentence(text) {
    const today = window.fmtDate(Date.now());
    const sys = `你是一个生活记录助手。用户会用中文口语描述今天做了什么、花了多少钱、吃了什么、睡了多久。
请解析成 JSON，格式：
{"records":[
 {"type":"activity","category":"健身|学习|娱乐|其他","note":"...","duration":分钟数(可选)},
 {"type":"expense","category":"餐饮|交通|购物|其他","note":"...","amount":数字},
 {"type":"food","name":食物名,"qty":数量,"qtyUnit":"个|份|克(可选,默认个)","meal":"早|午|晚|加餐(可选)"},
 {"type":"sleep","kind":"night|nap","sleepAt":"HH:MM(夜:入睡,可选)","wakeAt":"HH:MM(夜:起床,可选)","duration":分钟数(午睡必填),"note":"..."},
 {"type":"weight","kg":数字(如68.5)},
 {"type":"body","metric":"waist|chest|arm|thigh|fat","value":数字,"unit":"cm|%"}
]}
规则：
- 健身/运动/跑步/撸铁/瑜伽归入 activity, category=健身；学习/看书/上课/写代码归入 activity, category=学习；打游戏/看剧/逛街归入 activity, category=娱乐。
- 花钱的数字归入 expense，带上 category 与 note。
- 吃东西归入 food，name 用常见中文食物名。qty 是「数量」：若用户按"个/只/份/碗/杯"说，qty 填那个个数(如"两个鸡蛋"→qty:2)；若按"克/两"说，qty 填克数且 qtyUnit:"克"。切勿把"个"当克数。meal 按时间推测(默认午)。
- 睡眠：说「昨晚11点睡早上7点起」「睡眠23:00-7:00」归入 sleep kind=night 并给 sleepAt/wakeAt；说「午睡30分钟」「午休1小时」归入 sleep kind=nap 并给 duration(分钟)。
- 体重：说「称重68.5」「体重67.9」「今早称68」归入 weight 并给 kg(数字)。
- 围度/体脂：说「腰围82」「体脂18%」「臂围32cm」归入 body，metric 用 waist/chest/arm/thigh/fat，value 为数字，unit 为 cm 或 %。
- 一句话可能含多条，全部列出。
- 只输出 JSON，不要解释。`;
    const user = `今天是 ${today}。用户说：「${text}」`;
    const content = await callDeepSeek([
      { role: "system", content: sys },
      { role: "user", content: user }
    ]);
    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) { throw new Error("AI 返回无法解析：" + content.slice(0, 200)); }
    return (parsed.records || []).map(r => normalizeRecord(r));
  }

  // 把 AI 结果规整成本应用记录结构，并补全食物营养
  function normalizeRecord(r) {
    const base = { type: r.type, ts: Date.now() };
    if (r.type === "activity") {
      return Object.assign(base, {
        category: r.category || "其他",
        note: r.note || "",
        duration: r.duration ? Number(r.duration) : null
      });
    }
    if (r.type === "expense") {
      return Object.assign(base, {
        category: r.category || "其他",
        note: r.note || "",
        amount: Number(r.amount) || 0
      });
    }
    if (r.type === "food") {
      return buildFoodRecord(r.name, r.qty, r.meal, r.note, r.qtyUnit, r);
    }
    if (r.type === "sleep") {
      return buildSleepRecord(r.kind, r.sleepAt, r.wakeAt, r.duration, r.note);
    }
    if (r.type === "weight") {
      return buildWeightRecord(r.kg);
    }
    if (r.type === "body") {
      return buildBodyRecord(r.metric, r.value, r.unit, r.note);
    }
    return base;
  }

  // 构造睡眠记录；night 由 sleepAt/wakeAt 算时长，nap 直接用 duration
  function buildSleepRecord(kind, sleepAt, wakeAt, duration, note) {
    let mins = null;
    if (kind === "nap") {
      mins = Number(duration) || 0;
    } else {
      if (sleepAt && wakeAt) {
        mins = diffMinutes(sleepAt, wakeAt);
      } else if (duration) {
        mins = Number(duration) || 0;
      }
    }
    return {
      type: "sleep",
      ts: Date.now(),
      kind: kind === "nap" ? "nap" : "night",
      sleepAt: sleepAt || "",
      wakeAt: wakeAt || "",
      duration: mins,
      note: note || ""
    };
  }

  // "23:00" 与 "07:00" 的分钟差（跨午夜）
  function diffMinutes(a, b) {
    const pa = a.split(":").map(Number), pb = b.split(":").map(Number);
    let m = (pb[0] * 60 + pb[1]) - (pa[0] * 60 + pa[1]);
    if (m <= 0) m += 24 * 60;
    return m;
  }

  // 构造体重记录
  function buildWeightRecord(kg) {
    const v = Number(kg);
    return { type: "weight", ts: Date.now(), kg: isNaN(v) ? 0 : Math.round(v * 10) / 10 };
  }

  // 构造身体指标记录（围度/体脂）
  const BODY_META = {
    waist: { label: "腰围", unit: "cm" }, chest: { label: "胸围", unit: "cm" },
    arm: { label: "臂围", unit: "cm" }, thigh: { label: "腿围", unit: "cm" }, fat: { label: "体脂率", unit: "%" }
  };
  function buildBodyRecord(metric, value, unit, note) {
    const m = BODY_META[metric] ? metric : "waist";
    const v = Number(value);
    return { type: "body", ts: Date.now(), metric: m, value: isNaN(v) ? 0 : Math.round(v * 10) / 10, unit: BODY_META[m].unit, note: note || "" };
  }

  // 由食物名+数量构造饮食记录（用本地库算营养）
  function buildFoodRecord(name, qty, meal, note, qtyUnit, aiRec) {
    const food = window.findFood(name || "");
    let kcal = 0, protein = 0, carb = 0, fat = 0;
    let grams = 0;
    const raw = Number(qty);
    if (food) {
      const isGram = /克|g/i.test(qtyUnit || "");
      if (food.unit === "serving" && !isGram) {
        // serving 类：qty 通常为份数（如"2个鸡蛋"→2）
        let servings = isNaN(raw) ? 1 : raw;
        if (servings <= 0) servings = 1;
        // 智能兜底：若数值远超合理份数(>20)，多半是 AI 把"克"误当个数，按克折算
        if (servings > 20 && !/个|只|份|碗|杯|根|片|颗/i.test(qtyUnit || "")) {
          servings = servings / food.portion;
        }
        servings = Math.max(0.01, Math.min(servings, 50)); // 兜底：防离谱大数
        kcal = round(food.kcal * servings);
        protein = round(food.protein * servings);
        carb = round(food.carb * servings);
        fat = round(food.fat * servings);
        grams = food.portion * servings;
      } else {
        // 100g 类：qty 为克数
        let g = isNaN(raw) ? 100 : raw;
        if (g <= 0) g = 100;
        g = Math.min(g, 5000); // 兜底
        const factor = g / 100;
        kcal = round(food.kcal * factor);
        protein = round(food.protein * factor);
        carb = round(food.carb * factor);
        fat = round(food.fat * factor);
        grams = g;
      }
    } else if (aiRec && (aiRec.kcal || aiRec.protein || aiRec.carb || aiRec.fat)) {
      // 本地库未命中：用 AI 返回的营养作为「估算」值，避免变成 0 营养
      kcal = round(Number(aiRec.kcal) || 0);
      protein = round(Number(aiRec.protein) || 0);
      carb = round(Number(aiRec.carb) || 0);
      fat = round(Number(aiRec.fat) || 0);
      grams = isNaN(raw) ? 0 : raw;
    }
    return {
      type: "food",
      ts: Date.now(),
      name: name || (food ? food.name : "未知食物"),
      qty: grams,
      kcal, protein, carb, fat,
      meal: meal || "午",
      note: note || "",
      known: !!food
    };
  }

  // 生成每日回顾总结
  async function dailySummary(records, dateStr) {
    const cfg = window.Config.get();
    const plan = cfg.plan || "";
    const goals = cfg.goals || {};
    if (!cfg.apiKey) return "（未配置 API Key，仅显示统计）" + fallbackSummary(records, plan, goals);
    const data = JSON.stringify(records.map(r => ({
      type: r.type, category: r.category, note: r.note,
      amount: r.amount, name: r.name, kcal: r.kcal, meal: r.meal,
      duration: r.duration, kind: r.kind, sleepAt: r.sleepAt, wakeAt: r.wakeAt, kg: r.kg
    })), null, 0);
    const planName = { gain: "增肌", loss: "减脂", keep: "维持" }[plan] || "未设计划";
    const goalTxt = goals.kcal ? `目标: 热量${goals.kcal}kcal 蛋白${goals.protein}g 碳水${goals.carb}g 脂肪${goals.fat}g` : "未设饮食目标";
    const sys = `你是贴身生活教练。用户今天的计划是「${planName}」，${goalTxt}。
根据用户今天的记录，用亲切简短的中文写一段「今日回顾」(90字内)，并给出 1~2 条针对该计划的温和建议
(如减脂日是否热量/碳水超标、增肌日蛋白是否达标、睡眠不足如何改善、运动是否足够、体重相对计划方向的趋势)。
若有体重记录，结合计划点评趋势(减脂应下降、增肌可微升)。只输出文本，不要 JSON。`;
    const content = await callDeepSeek([
      { role: "system", content: sys },
      { role: "user", content: `日期 ${dateStr} 的记录：${data}` }
    ]);
    return content;
  }

  function fallbackSummary(records, plan, goals) {
    const foods = records.filter(r => r.type === "food");
    const acts = records.filter(r => r.type === "activity");
    const exps = records.filter(r => r.type === "expense");
    const sleeps = records.filter(r => r.type === "sleep");
    const kcal = foods.reduce((s, r) => s + (r.kcal || 0), 0);
    const prot = foods.reduce((s, r) => s + (r.protein || 0), 0);
    const cost = exps.reduce((s, r) => s + (r.amount || 0), 0);
    const sleepMin = sleeps.reduce((s, r) => s + (r.duration || 0), 0);
    const sleepH = (sleepMin / 60).toFixed(1);
    let tip = "";
    if (goals.kcal) {
      const diff = Math.round(kcal - goals.kcal);
      tip = diff > 0 ? ` 热量超目标${diff}kcal。` : ` 热量剩${Math.abs(diff)}kcal额度。`;
      if (goals.protein && prot < goals.protein) tip += ` 蛋白差${Math.round(goals.protein - prot)}g。`;
    }
    if (sleepMin && sleepMin < 360) tip += " 睡眠不足7小时，注意恢复。";
    const w = records.filter(r => r.type === "weight").map(r => r.kg).filter(Boolean);
    const wTxt = w.length ? ` 体重${w[w.length - 1]}kg。` : "";
    return `\n活动${acts.length}项、饮食${foods.length}餐(约${Math.round(kcal)}kcal/${Math.round(prot)}g蛋白)、睡眠${sleepH}h、花费¥${Math.round(cost)}。${tip}${wTxt}`;
  }

  function round(n) { return Math.round(n * 10) / 10; }

  // 生成周期报告（周/月）
  async function generateReport(records, periodLabel, summary) {
    const cfg = window.Config.get();
    const plan = cfg.plan || "";
    if (!cfg.apiKey) return "（未配置 API Key，仅显示统计）\n" + summary;
    const planName = { gain: "增肌", loss: "减脂", keep: "维持" }[plan] || "未设计划";
    const goals = cfg.goals || {};
    const goalTxt = goals.kcal ? `目标: 热量${goals.kcal} 蛋白${goals.protein}g 碳水${goals.carb}g 脂肪${goals.fat}g` : "未设目标";
    const sys = `你是贴身生活教练。用户${periodLabel}（计划「${planName}」，${goalTxt}）。
根据这段时间的汇总数据，用亲切中文写一段${periodLabel}总结(120字内)，含：训练频率评价、饮食达标情况、睡眠、体重趋势，并给 2~3 条下阶段可执行建议。只输出文本，不要 JSON。`;
    const content = await callDeepSeek([
      { role: "system", content: sys },
      { role: "user", content: `汇总数据：\n${summary}` }
    ]);
    return content;
  }

  // 视觉识别：把食物照片 base64 描述成文字（再交给 parseSentence 建记录）
  async function recognizeFood(base64) {
    const cfg = window.Config.get();
    const apiKey = (cfg.apiKey || "").trim();
    if (!apiKey) throw new Error("未配置 DeepSeek API Key，请到设置填写。");
    const model = cfg.model || "deepseek-chat";
    const body = {
      model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "请描述这张照片里的食物，列出每样食物并估算份量(克或份)，用一句中文口语说明，例如：一盘米饭约200g，一份鸡胸肉150g，一份炒青菜100g。不要解释。" },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64," + base64 } }
        ]
      }]
    };
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error("视觉识别失败(" + res.status + "): " + t.slice(0, 150)); }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  window.AI = { parseSentence, dailySummary, generateReport, recognizeFood, buildFoodRecord, buildSleepRecord, diffMinutes, buildWeightRecord, buildBodyRecord, BODY_META };
})();
