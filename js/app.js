// 前端主逻辑
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  let currentTab = "today";

  // ---------- 工具 ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function money(n) { return "¥" + (Math.round(n * 100) / 100); }
  function timeOf(ts) {
    const d = new Date(ts);
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  // 提醒文本 <-> 数组
  function reminderText(list) {
    if (!list || !list.length) return "";
    return list.map(r => r.time + "|" + r.text).join("\n");
  }
  function parseReminders(text) {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const i = l.indexOf("|");
      if (i < 0) return null;
      return { time: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
    }).filter(r => r && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time));
  }

  // 提醒检查（每分钟）
  let _firedReminders = {};
  function startReminderChecker() {
    setInterval(() => {
      const list = (window.Config.get().reminders) || [];
      const now = new Date();
      const key = window.fmtDate(now.getTime()) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
      list.forEach(r => {
        const k = key + " " + r.time;
        if (r.time === pad(now.getHours()) + ":" + pad(now.getMinutes()) && !_firedReminders[k]) {
          _firedReminders[k] = true;
          showReminder(r.text);
        }
      });
    }, 30 * 1000);
  }
  function showReminder(text) {
    const el = document.createElement("div");
    el.className = "reminder-toast";
    el.textContent = "⏰ " + text;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 8000);
  }

  // ---------- 渲染：今日 ----------
  function renderToday() {
    const dateStr = window.fmtDate(Date.now());
    const recs = window.Store.byDate(dateStr);
    const acts = recs.filter(r => r.type === "activity");
    const exps = recs.filter(r => r.type === "expense");
    const foods = recs.filter(r => r.type === "food");
    const sleeps = recs.filter(r => r.type === "sleep");
    const weights = recs.filter(r => r.type === "weight").map(r => r.kg).filter(Boolean);
    const lastWeight = weights.length ? weights[weights.length - 1] : null;

    const kcal = foods.reduce((s, r) => s + (r.kcal || 0), 0);
    const prot = foods.reduce((s, r) => s + (r.protein || 0), 0);
    const cost = exps.reduce((s, r) => s + (r.amount || 0), 0);
    const fitMin = acts.filter(a => a.category === "健身").reduce((s, a) => s + (a.duration || 0), 0);
    const sleepMin = sleeps.reduce((s, r) => s + (r.duration || 0), 0);
    const sleepH = (sleepMin / 60).toFixed(1);

    const streaks = computeStreaks();

    let html = `
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${Math.round(kcal)}</div><div class="stat-l">热量 kcal</div></div>
        <div class="stat"><div class="stat-v">${Math.round(prot)}g</div><div class="stat-l">蛋白质</div></div>
        <div class="stat"><div class="stat-v">${lastWeight != null ? lastWeight : "—"}</div><div class="stat-l">体重 kg</div></div>
        <div class="stat"><div class="stat-v">${sleepH}h</div><div class="stat-l">睡眠</div></div>
        <div class="stat"><div class="stat-v">${money(cost)}</div><div class="stat-l">花费</div></div>
      </div>
      <div class="streak-row">
        <div class="streak"><div class="streak-v">🔥 ${streaks.trainStreak}</div><div class="streak-l">连续训练天</div></div>
        <div class="streak"><div class="streak-v">📅 ${streaks.recordStreak}</div><div class="streak-l">连续记录天</div></div>
        <div class="streak"><div class="streak-v">🎯 ${streaks.hasGoal ? streaks.dietStreak : "—"}</div><div class="streak-l">连续达标天</div></div>
      </div>
      <div class="summary-box">
        <div class="summary-head">🤖 今日回顾</div>
        <div id="summaryText" class="summary-text">点击下方按钮生成 AI 回顾。</div>
        <button id="btnSummary" class="ghost small">生成回顾</button>
      </div>
      <h3 class="sec">时间线</h3>
      <div class="timeline">
    `;
    if (recs.length === 0) {
      html += `<div class="empty">今天还没有记录，用上方输入框记一笔吧～</div>`;
    } else {
      for (const r of recs) html += recCard(r);
    }
    html += `</div>`;
    $("#view").innerHTML = html;

    $("#btnSummary") && $("#btnSummary").addEventListener("click", async () => {
      const st = $("#summaryText");
      st.textContent = "生成中…";
      try {
        const text = await window.AI.dailySummary(recs, dateStr);
        st.textContent = text;
      } catch (e) {
        st.textContent = "⚠️ " + e.message;
      }
    });
    bindCardActions();
  }

  function recCard(r) {
    let icon = "📝", title = "", sub = "";
    if (r.type === "activity") {
      icon = r.category === "健身" ? "💪" : r.category === "学习" ? "📚" : "🎮";
      title = r.category + (r.duration ? ` · ${r.duration}分钟` : "");
      sub = r.note || "";
    } else if (r.type === "expense") {
      icon = "💰";
      title = r.category + " · " + money(r.amount);
      sub = r.note || "";
    } else if (r.type === "food") {
      icon = "🍽️";
      title = `${r.name} (${Math.round(r.kcal)}kcal / 蛋白${Math.round(r.protein)}g)`;
      sub = `${r.meal} · ${r.qty}g · 碳水${Math.round(r.carb)}g 脂肪${Math.round(r.fat)}g`;
    } else if (r.type === "sleep") {
      icon = r.kind === "nap" ? "😴" : "🌙";
      const h = (r.duration || 0) / 60;
      title = (r.kind === "nap" ? "午睡" : "夜间睡眠") + ` · ${h.toFixed(1)}h`;
      sub = r.kind === "nap" ? (r.note || "") : `${r.sleepAt || "?"} → ${r.wakeAt || "?"}`;
    } else if (r.type === "weight") {
      icon = "⚖️";
      title = `体重 ${r.kg} kg`;
      sub = r.note || "";
    } else if (r.type === "body") {
      const meta = (window.AI.BODY_META && window.AI.BODY_META[r.metric]) || { label: "围度" };
      icon = "📏";
      title = `${meta.label} ${r.value}${r.unit}`;
      sub = r.note || "";
    }
    return `
      <div class="card" data-id="${r.id}">
        <div class="card-icon">${icon}</div>
        <div class="card-main">
          <div class="card-title">${esc(title)}</div>
          <div class="card-sub">${esc(sub)} <span class="card-time">${timeOf(r.ts)}</span></div>
        </div>
        <button class="card-del" data-del="${r.id}">🗑</button>
      </div>`;
  }

  function bindCardActions() {
    $$(".card-del").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const id = b.getAttribute("data-del");
      if (confirm("删除这条记录？")) { window.Store.remove(id); render(); }
    }));
  }

  // ---------- 渲染：本月 ----------
  function renderMonth() {
    const monthStr = window.fmtMonth(Date.now());
    const recs = window.Store.byMonth(monthStr);
    const exps = recs.filter(r => r.type === "expense");
    const foods = recs.filter(r => r.type === "food");

    // 分类汇总
    const byCat = {};
    exps.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const total = exps.reduce((s, e) => s + e.amount, 0);
    const maxCat = Math.max(1, ...Object.values(byCat));

    const kcal = foods.reduce((s, r) => s + (r.kcal || 0), 0);
    const prot = foods.reduce((s, r) => s + (r.protein || 0), 0);

    let bars = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
      <div class="bar-row">
        <div class="bar-label">${esc(c)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / maxCat * 100).toFixed(0)}%"></div></div>
        <div class="bar-val">${money(v)}</div>
      </div>`).join("") || `<div class="empty">本月还没有花销记录。</div>`;

    $("#view").innerHTML = `
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${money(total)}</div><div class="stat-l">本月花费</div></div>
        <div class="stat"><div class="stat-v">${Math.round(kcal)}</div><div class="stat-l">饮食热量</div></div>
        <div class="stat"><div class="stat-v">${Math.round(prot)}g</div><div class="stat-l">蛋白质</div></div>
      </div>
      <h3 class="sec">花销分类</h3>
      <div class="bars">${bars}</div>
      <h3 class="sec">每日花费趋势</h3>
      <div id="trend" class="trend"></div>
    `;
    renderTrend(recs);
  }

  function renderTrend(recs) {
    const days = {};
    recs.filter(r => r.type === "expense").forEach(e => {
      const d = new Date(e.ts).getDate();
      days[d] = (days[d] || 0) + e.amount;
    });
    const max = Math.max(1, ...Object.values(days));
    const el = $("#trend");
    if (!el) return;
    let html = "";
    const today = new Date().getDate();
    for (let d = 1; d <= today; d++) {
      const v = days[d] || 0;
      const h = (v / max * 100).toFixed(0);
      html += `<div class="tcol" title="${d}日 ${money(v)}">
        <div class="tbar" style="height:${h}%"></div>
        <div class="tday">${d}</div></div>`;
    }
    el.innerHTML = html;
  }

  // ---------- 渲染：饮食 ----------
  function renderFood() {
    const dateStr = window.fmtDate(Date.now());
    const foods = window.Store.byDate(dateStr).filter(r => r.type === "food");
    const meals = { 早: [], 午: [], 晚: [], 加餐: [] };
    foods.forEach(f => meals[f.meal || "午"].push(f));
    const tK = foods.reduce((s, r) => s + (r.kcal || 0), 0);
    const tP = foods.reduce((s, r) => s + (r.protein || 0), 0);
    const tC = foods.reduce((s, r) => s + (r.carb || 0), 0);
    const tF = foods.reduce((s, r) => s + (r.fat || 0), 0);

    const cfg = window.Config.get();
    const goals = cfg.goals || {};
    const goalHtml = goals.kcal ? goalProgress(tK, tP, tC, tF, goals) : `
      <div class="empty">未设饮食目标，去「设置」选择增肌/减脂计划并设定目标。</div>`;

    let html = `
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${Math.round(tK)}</div><div class="stat-l">总热量</div></div>
        <div class="stat"><div class="stat-v">${Math.round(tP)}g</div><div class="stat-l">蛋白</div></div>
        <div class="stat"><div class="stat-v">${Math.round(tC)}g</div><div class="stat-l">碳水</div></div>
        <div class="stat"><div class="stat-v">${Math.round(tF)}g</div><div class="stat-l">脂肪</div></div>
      </div>
      <h3 class="sec">🎯 今日目标</h3>
      ${goalHtml}
    `;
    for (const m of ["早", "午", "晚", "加餐"]) {
      html += `<h3 class="sec">${m === "加餐" ? "加餐/零食" : m + "餐"}</h3>`;
      if (meals[m].length === 0) html += `<div class="empty">暂无</div>`;
      else meals[m].forEach(f => html += recCard(f));
    }
    const sleeps = window.Store.byDate(dateStr).filter(r => r.type === "sleep");
    html += `<h3 class="sec">😴 睡眠</h3>`;
    if (sleeps.length === 0) html += `<div class="empty">暂无睡眠记录</div>`;
    else sleeps.forEach(s => html += recCard(s));
    html += `<div style="display:flex;gap:8px;">
      <button id="btnAddFood" class="primary" style="flex:1">＋ 饮食</button>
      <button id="btnAddSleep" class="ghost" style="flex:1">＋ 睡眠</button>
    </div>
    <button id="btnPhoto" class="ghost wide" style="margin-top:8px">📷 拍照识别饮食</button>`;
    $("#view").innerHTML = html;
    $("#btnAddFood").addEventListener("click", () => openFoodModal());
    $("#btnAddSleep").addEventListener("click", () => openSleepModal());
    $("#btnPhoto").addEventListener("click", () => openPhotoModal());
    bindCardActions();
  }

  // 拍照/上传识别饮食（视觉模型）
  function openPhotoModal() {
    openModal("拍照识别饮食", `
      <div class="form">
        <label>上传食物照片（AI 识别内容并估算分量）</label>
        <input id="phFile" type="file" accept="image/*" />
        <div id="phStatus" class="status"></div>
        <button id="phSubmit" class="primary wide">识别并记录</button>
        <div class="hint">需填写 DeepSeek API Key 且联网。图片仅在识别时发送给 DeepSeek，不会另存。</div>
      </div>
    `);
    $("#phSubmit").addEventListener("click", async () => {
      const file = $("#phFile").files[0];
      if (!file) { alert("请先选择一张照片"); return; }
      const st = $("#phStatus"); st.textContent = "读取图片…";
      try {
        const b64 = await fileToBase64(file);
        st.textContent = "调用视觉模型识别中…";
        const text = await window.AI.recognizeFood(b64);
        st.textContent = "识别结果：" + text;
        const recs = await window.AI.parseSentence(text);
        recs.filter(r => r.type === "food").forEach(r => window.Store.add(r));
        // 若识别出非食物也尽量记录
        recs.filter(r => r.type !== "food").forEach(r => window.Store.add(r));
        closeModal(); render();
      } catch (e) {
        st.textContent = "⚠️ " + e.message;
      }
    });
  }
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const dataUrl = fr.result;
        const b64 = dataUrl.split(",")[1];
        res(b64);
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  // 目标进度条
  function goalProgress(k, p, c, f, g) {
    const row = (label, val, goal, unit) => {
      const pct = goal ? Math.min(100, Math.round(val / goal * 100)) : 0;
      const over = goal && val > goal;
      return `<div class="goal-row">
        <div class="goal-top"><span>${label}</span><span class="${over ? "over" : ""}">${Math.round(val)}${unit} / ${goal}${unit}</span></div>
        <div class="goal-track"><div class="goal-fill ${over ? "over" : ""}" style="width:${pct}%"></div></div>
      </div>`;
    };
    return `<div class="goals">${row("热量", k, g.kcal, "")}${row("蛋白质", p, g.protein, "g")}${row("碳水", c, g.carb, "g")}${row("脂肪", f, g.fat, "g")}</div>`;
  }

  // 睡眠弹层
  function openSleepModal() {
    openModal("添加睡眠", `
      <div class="form">
        <label>类型</label>
        <select id="sKind"><option value="night">夜间睡眠</option><option value="nap">午睡/小憩</option></select>
        <div id="nightFields">
          <label>入睡时间 (HH:MM)</label>
          <input id="sSleepAt" type="time" value="23:00" />
          <label>起床时间 (HH:MM)</label>
          <input id="sWakeAt" type="time" value="07:00" />
        </div>
        <div id="napField" style="display:none">
          <label>午睡时长 (分钟)</label>
          <input id="sDur" type="number" placeholder="30" value="30" />
        </div>
        <button id="sSubmit" class="primary wide">添加</button>
      </div>
    `);
    const kind = $("#sKind");
    kind.addEventListener("change", () => {
      const isNap = kind.value === "nap";
      $("#nightFields").style.display = isNap ? "none" : "block";
      $("#napField").style.display = isNap ? "block" : "none";
    });
    $("#sSubmit").addEventListener("click", () => {
      const k = kind.value;
      const rec = k === "nap"
        ? window.AI.buildSleepRecord("nap", "", "", $("#sDur").value, "")
        : window.AI.buildSleepRecord("night", $("#sSleepAt").value, $("#sWakeAt").value, "", "");
      if (!rec.duration || rec.duration <= 0) { alert("请填写有效时间/时长"); return; }
      window.Store.add(rec);
      closeModal(); render();
    });
  }

  // ---------- 渲染：设置 ----------
  function renderSettings() {
    const cfg = window.Config.get();
    let plan = cfg.plan || "";
    const g = cfg.goals || {};
    const planBtn = (val, label) => `<button class="plan-opt ${plan === val ? "on" : ""}" data-plan="${val}">${label}</button>`;
    $("#view").innerHTML = `
      <h3 class="sec">🎯 健身/饮食计划</h3>
      <div class="form">
        <label>选择计划（自动填入参考目标，可改）</label>
        <div class="plan-row">
          ${planBtn("gain", "增肌")}
          ${planBtn("loss", "减脂")}
          ${planBtn("keep", "维持")}
          ${planBtn("", "不设置")}
        </div>
        <label>每日热量目标 (kcal)</label>
        <input id="gKcal" type="number" value="${g.kcal || ""}" placeholder="如 2200" />
        <label>蛋白质目标 (g)</label>
        <input id="gProtein" type="number" value="${g.protein || ""}" placeholder="如 140" />
        <label>碳水目标 (g)</label>
        <input id="gCarb" type="number" value="${g.carb || ""}" placeholder="如 250" />
        <label>脂肪目标 (g)</label>
        <input id="gFat" type="number" value="${g.fat || ""}" placeholder="如 70" />
        <button id="btnSaveGoals" class="primary wide">保存计划与目标</button>
        <div class="hint">增肌参考：热量盈余、高蛋白；减脂参考：热量缺口、控碳水。数值只是起点，按自身情况调。</div>
      </div>

      <h3 class="sec">DeepSeek 设置</h3>
      <div class="form">
        <label>API Key</label>
        <input id="inpKey" type="password" placeholder="sk-..." value="${esc(cfg.apiKey || "")}" />
        <label>模型</label>
        <input id="inpModel" type="text" placeholder="deepseek-chat" value="${esc(cfg.model || "deepseek-chat")}" />
        <button id="btnSaveCfg" class="primary wide">保存设置</button>
        <div class="hint">Key 仅保存在本机浏览器，不会上传到除 DeepSeek 以外的任何地方。</div>
      </div>
      <h3 class="sec">⏰ 定时提醒（页面打开时生效）</h3>
      <div class="form">
        <label>提醒时间 (HH:MM) 与内容（每行一条，用 | 分隔，如 20:00|记录今日）</label>
        <textarea id="inpReminders" placeholder="20:00|记录今日饮食&#10;08:00|称体重">${reminderText(cfg.reminders)}</textarea>
        <button id="btnSaveRem" class="primary wide">保存提醒</button>
        <div class="hint">提醒仅在 App/网页前台打开时弹出（浏览器限制后台推送）。真后台推送需打包成原生 App，后续可加。</div>
      </div>
      <h3 class="sec">数据</h3>
      <button id="btnExport" class="ghost wide">导出备份(JSON)</button>
      <button id="btnExportCsv" class="ghost wide">导出 Excel(CSV)</button>
      <button id="btnClear" class="danger wide">清空全部数据</button>
      <div class="hint">所有数据存于本机 localStorage，卸载/清缓存会丢失，建议定期导出。</div>
    `;

    // 计划快捷选择：自动填充参考目标
    const PRESET = {
      gain: { kcal: 2600, protein: 150, carb: 300, fat: 80 },
      loss: { kcal: 1800, protein: 130, carb: 150, fat: 55 },
      keep: { kcal: 2200, protein: 120, carb: 250, fat: 70 }
    };
    $$(".plan-opt").forEach(b => b.addEventListener("click", () => {
      const p = b.getAttribute("data-plan");
      $$(".plan-opt").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      plan = p;
      if (PRESET[p]) {
        $("#gKcal").value = PRESET[p].kcal;
        $("#gProtein").value = PRESET[p].protein;
        $("#gCarb").value = PRESET[p].carb;
        $("#gFat").value = PRESET[p].fat;
      }
    }));

    $("#btnSaveGoals").addEventListener("click", () => {
      const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? 0 : v; };
      window.Config.set({
        plan,
        goals: { kcal: num("#gKcal"), protein: num("#gProtein"), carb: num("#gCarb"), fat: num("#gFat") }
      });
      alert("已保存计划与目标");
      render();
    });
    $("#btnSaveCfg").addEventListener("click", () => {
      window.Config.set({
        apiKey: $("#inpKey").value.trim(),
        model: $("#inpModel").value.trim() || "deepseek-chat"
      });
      alert("已保存");
    });
    $("#btnSaveRem").addEventListener("click", () => {
      const list = parseReminders($("#inpReminders").value);
      window.Config.set({ reminders: list });
      alert("已保存 " + list.length + " 条提醒");
    });
    $("#btnExport").addEventListener("click", exportData);
    $("#btnExportCsv").addEventListener("click", exportCsv);
    $("#btnClear").addEventListener("click", () => {
      if (confirm("确定清空全部记录？此操作不可恢复。")) { window.Store.clear(); render(); }
    });
  }

  function exportData() {
    const data = JSON.stringify(window.Store.all(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lifelog-backup-" + window.fmtDate(Date.now()) + ".json";
    a.click();
  }

  // 导出 CSV（Excel 可直接打开）：分类型多 sheet 合并为单表（类型+字段）
  function exportCsv() {
    const recs = window.Store.all().sort((a, b) => a.ts - b.ts);
    const headers = ["日期", "时间", "类型", "分类/指标", "内容/食物", "数量/数值", "热量", "蛋白", "碳水", "脂肪", "金额", "时长", "备注"];
    const rows = recs.map(r => {
      const d = new Date(r.ts);
      const date = window.fmtDate(r.ts);
      const time = pad(d.getHours()) + ":" + pad(d.getMinutes());
      const cell = v => `"${(v == null ? "" : String(v)).replace(/"/g, '""')}"`;
      let type = r.type, cat = "", name = "", qty = "", kcal = "", prot = "", carb = "", fat = "", amt = "", dur = "", note = "";
      if (r.type === "activity") { cat = r.category; dur = r.duration || ""; note = r.note || ""; }
      else if (r.type === "expense") { cat = r.category; amt = r.amount; note = r.note || ""; }
      else if (r.type === "food") { name = r.name; qty = r.qty; kcal = r.kcal; prot = r.protein; carb = r.carb; fat = r.fat; }
      else if (r.type === "sleep") { cat = r.kind === "nap" ? "午睡" : "夜间"; dur = r.duration; note = (r.sleepAt || "") + "→" + (r.wakeAt || ""); }
      else if (r.type === "weight") { cat = "体重"; qty = r.kg + "kg"; }
      else if (r.type === "body") { const mm = (window.AI.BODY_META || {})[r.metric] || { label: r.metric }; cat = mm.label; qty = r.value + (r.unit || ""); }
      return [date, time, type, cat, name, qty, kcal, prot, carb, fat, amt, dur, note].map(cell).join(",");
    });
    const csv = "﻿" + headers.map(h => `"${h}"`).join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lifelog-" + window.fmtDate(Date.now()) + ".csv";
    a.click();
  }

  // ---------- 弹层：手动添加 ----------
  function openModal(title, bodyHtml) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    $("#modal").classList.remove("hidden");
  }
  function closeModal() { $("#modal").classList.add("hidden"); }

  function openFoodModal() {
    const opts = window.FOOD_DB.slice(0, 60).map(f => `<option value="${esc(f.name)}">${esc(f.name)}</option>`).join("");
    openModal("添加饮食", `
      <div class="form">
        <label>食物（也可直接输入）</label>
        <input id="fName" list="foodlist" placeholder="如：鸡胸肉 / 鸡蛋" />
        <datalist id="foodlist">${opts}</datalist>
        <label>数量（克 或 份数）</label>
        <input id="fQty" type="number" placeholder="100" value="100" />
        <label>餐次</label>
        <select id="fMeal"><option>早</option><option selected>午</option><option>晚</option><option>加餐</option></select>
        <button id="fSubmit" class="primary wide">添加</button>
      </div>
    `);
    $("#fSubmit").addEventListener("click", () => {
      const rec = window.AI.buildFoodRecord($("#fName").value, $("#fQty").value, $("#fMeal").value, "");
      if (!rec.name) { alert("请输入食物名"); return; }
      window.Store.add(rec);
      closeModal(); render();
    });
  }

  // ---------- 快速记录 ----------
  async function handleParse() {
    const text = $("#quickText").value.trim();
    if (!text) { alert("先输入点什么～"); return; }
    const st = $("#parseStatus");
    st.textContent = "AI 解析中…";
    $("#btnParse").disabled = true;
    try {
      const recs = await window.AI.parseSentence(text);
      if (!recs.length) { st.textContent = "没能解析出记录，换个说法试试。"; return; }
      recs.forEach(r => window.Store.add(r));
      st.textContent = `✅ 已记录 ${recs.length} 条`;
      $("#quickText").value = "";
      render();
    } catch (e) {
      st.textContent = "⚠️ " + e.message;
    } finally {
      $("#btnParse").disabled = false;
    }
  }

  // ---------- Tab 切换 ----------
  // 体重相关性洞察：对比「训练日」与「非训练日」的平均体重，以及饮食达标日 vs 超标日
  function computeWeightInsight(series) {
    if (series.length < 2) return `<div class="empty">记录满 2 天以上后，会自动分析训练/饮食与体重的关系。</div>`;
    const cfg = window.Config.get();
    const goals = cfg.goals || {};
    // 各天是否有训练、是否饮食达标
    const dayInfo = {};
    window.Store.all().forEach(r => {
      const d = window.fmtDate(r.ts);
      if (!dayInfo[d]) dayInfo[d] = { train: false, kcal: 0 };
      if (r.type === "activity" && r.category === "健身") dayInfo[d].train = true;
      if (r.type === "food") dayInfo[d].kcal += (r.kcal || 0);
    });
    const trainDays = [], offDays = [], onTarget = [], offTarget = [];
    series.forEach(s => {
      const info = dayInfo[s.date] || { train: false, kcal: 0 };
      if (info.train) trainDays.push(s.kg); else offDays.push(s.kg);
      if (goals.kcal) {
        if (info.kcal <= goals.kcal) onTarget.push(s.kg); else offTarget.push(s.kg);
      }
    });
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
    const at = avg(trainDays), ao = avg(offDays);
    const ot = avg(onTarget), of = avg(offTarget);
    let html = `<div class="insight">`;
    if (at != null && ao != null) {
      const diff = Math.round((at - ao) * 10) / 10;
      html += `<div class="ins-row"><span>训练日平均体重</span><b>${at}kg</b></div>`;
      html += `<div class="ins-row"><span>非训练日平均体重</span><b>${ao}kg</b></div>`;
      html += `<div class="ins-note">训练日比非训练日${diff >= 0 ? "高" : "低"} ${Math.abs(diff)}kg（常因水分/肌糖原，未必是脂肪变化）。</div>`;
    }
    if (ot != null && of != null) {
      const diff = Math.round((ot - of) * 10) / 10;
      html += `<div class="ins-row"><span>饮食达标日平均体重</span><b>${ot}kg</b></div>`;
      html += `<div class="ins-row"><span>饮食超标日平均体重</span><b>${of}kg</b></div>`;
      html += `<div class="ins-note">饮食达标日比超标日${diff >= 0 ? "高" : "低"} ${Math.abs(diff)}kg。</div>`;
    }
    html += `</div>`;
    return html;
  }

  // 打卡 streak：连续训练天数、连续饮食达标天数、连续记录天数
  function computeStreaks() {
    const cfg = window.Config.get();
    const goals = cfg.goals || {};
    const all = window.Store.all();
    // 按天聚合
    const byDay = {};
    all.forEach(r => {
      const d = window.fmtDate(r.ts);
      if (!byDay[d]) byDay[d] = { train: false, kcal: 0, any: true };
      if (r.type === "activity" && r.category === "健身") byDay[d].train = true;
      if (r.type === "food") byDay[d].kcal += (r.kcal || 0);
    });
    const days = Object.keys(byDay).sort();
    const today = window.fmtDate(Date.now());
    // 从今天往前数连续天数
    const streakFrom = (pred) => {
      let cnt = 0;
      let cur = new Date();
      // 若今天没有数据，从昨天起算（不中断连续）
      const todayKey = window.fmtDate(cur.getTime());
      if (!byDay[todayKey]) cur.setDate(cur.getDate() - 1);
      while (true) {
        const key = window.fmtDate(cur.getTime());
        if (byDay[key] && pred(byDay[key])) { cnt++; cur.setDate(cur.getDate() - 1); }
        else break;
      }
      return cnt;
    };
    const trainStreak = streakFrom(d => d.train);
    const recordStreak = streakFrom(d => d.any);
    let dietStreak = 0;
    if (goals.kcal) {
      dietStreak = streakFrom(d => d.kcal <= goals.kcal && d.kcal > 0);
    }
    return { trainStreak, recordStreak, dietStreak, hasGoal: !!goals.kcal };
  }

  // ---------- 渲染：体重 ----------
  function renderWeight() {
    const cfg = window.Config.get();
    const plan = cfg.plan || "";
    const all = window.Store.all().filter(r => r.type === "weight");
    // 按天聚合：每天取最后一次称重
    const byDay = {};
    all.forEach(r => { byDay[window.fmtDate(r.ts)] = r.kg; });
    const days = Object.keys(byDay).sort();
    const series = days.map(d => ({ date: d, kg: byDay[d] }));

    let latest = series.length ? series[series.length - 1].kg : null;
    let first = series.length ? series[0].kg : null;
    let delta = (latest != null && first != null) ? Math.round((latest - first) * 10) / 10 : null;
    let trendTxt = "", trendCls = "";
    if (delta != null && delta !== 0) {
      const down = delta < 0;
      const good = (plan === "loss" && down) || (plan === "gain" && !down);
      trendTxt = (down ? "↓ " : "↑ ") + Math.abs(delta) + "kg（" + (down ? "下降" : "上升") + "）";
      trendCls = good ? "good" : "warn";
    }

    let chart = `<div class="empty">还没有体重记录，点下方按钮记一次吧。</div>`;
    if (series.length >= 1) {
      chart = `<canvas id="wChart" width="460" height="220" style="width:100%;height:auto;"></canvas>`;
    }

    // 相关性洞察：训练日 vs 非训练日 的体重均值
    const insight = computeWeightInsight(series);

    $("#view").innerHTML = `
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${latest != null ? latest : "—"}</div><div class="stat-l">最新 kg</div></div>
        <div class="stat"><div class="stat-v">${first != null ? first : "—"}</div><div class="stat-l">起始 kg</div></div>
        <div class="stat"><div class="stat-v" style="font-size:14px">${trendTxt || "—"}</div><div class="stat-l">变化</div></div>
      </div>
      <div class="summary-box">
        <div class="summary-head">⚖️ 体重趋势</div>
        <div class="wchart-wrap">${chart}</div>
        <div class="hint">${plan ? ("当前计划：" + ({ gain: "增肌", loss: "减脂", keep: "维持" }[plan]) + "，" + (plan === "loss" ? "下降为好" : plan === "gain" ? "适度上升为好" : "保持稳定为好")) : "未设计划，去设置选一个。"}</div>
      </div>
      <h3 class="sec">🔍 体重相关性洞察</h3>
      ${insight}
      <h3 class="sec">📊 多维趋势（体重·训练·热量）</h3>
      <div class="summary-box"><div class="wchart-wrap"><canvas id="mChart" width="460" height="220" style="width:100%;height:auto;"></canvas></div>
        <div class="hint">蓝=体重(右轴kg) · 橙=训练分钟 · 绿=当日热量。看训练/热量与体重的同步变化。</div>
      </div>
      <h3 class="sec">📏 围度 / 体脂</h3>
      ${bodySection()}
      <h3 class="sec">历史记录</h3>
      <div class="timeline">
        ${series.length ? series.slice().reverse().map(s => `<div class="card"><div class="card-icon">⚖️</div><div class="card-main"><div class="card-title">${s.kg} kg</div><div class="card-sub">${s.date}</div></div></div>`).join("") : `<div class="empty">暂无</div>`}
      </div>
      <div style="display:flex;gap:8px;">
        <button id="btnAddWeight" class="primary" style="flex:1">＋ 体重</button>
        <button id="btnAddBody" class="ghost" style="flex:1">＋ 围度/体脂</button>
      </div>
    `;
    if (series.length >= 1) drawWeightChart(series, plan);
    drawMultiChart();
    $("#btnAddWeight").addEventListener("click", () => openWeightModal());
    $("#btnAddBody").addEventListener("click", () => openBodyModal());
  }

  // 围度/体脂：各指标最新值 + 历史
  function bodySection() {
    const all = window.Store.all().filter(r => r.type === "body");
    if (!all.length) return `<div class="empty">还没有围度/体脂记录。</div>`;
    const meta = window.AI.BODY_META || {};
    const byMetric = {};
    all.forEach(r => { (byMetric[r.metric] = byMetric[r.metric] || []).push(r); });
    let html = `<div class="body-latest">`;
    Object.keys(byMetric).forEach(m => {
      const arr = byMetric[m].sort((a, b) => b.ts - a.ts);
      const mm = meta[m] || { label: m };
      html += `<div class="body-chip">${mm.label}<b>${arr[0].value}${arr[0].unit}</b></div>`;
    });
    html += `</div><div class="timeline">`;
    all.sort((a, b) => b.ts - a.ts).forEach(r => { html += recCard(r); });
    html += `</div>`;
    return html;
  }

  // 围度/体脂弹层
  function openBodyModal() {
    const opts = Object.entries(window.AI.BODY_META || {}).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
    openModal("记围度/体脂", `
      <div class="form">
        <label>指标</label>
        <select id="bMetric">${opts}</select>
        <label>数值</label>
        <input id="bValue" type="number" step="0.1" placeholder="如 82" />
        <button id="bSubmit" class="primary wide">保存</button>
      </div>
    `);
    $("#bSubmit").addEventListener("click", () => {
      const v = parseFloat($("#bValue").value);
      if (isNaN(v) || v <= 0) { alert("请输入有效数值"); return; }
      window.Store.add(window.AI.buildBodyRecord($("#bMetric").value, v, "", ""));
      closeModal(); render();
    });
  }

  function drawWeightChart(series, plan) {
    const cv = $("#wChart");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height, pad = 36;
    ctx.clearRect(0, 0, W, H);
    const kgs = series.map(s => s.kg);
    let min = Math.min(...kgs), max = Math.max(...kgs);
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const n = series.length;
    const x = i => pad + (n === 1 ? (W - 2 * pad) / 2 : (W - 2 * pad) * i / (n - 1));
    const y = v => H - pad - (v - min) / range * (H - 2 * pad);

    // 网格 + Y 轴标签
    ctx.strokeStyle = "#e8ecf3"; ctx.fillStyle = "#7a869a"; ctx.font = "11px sans-serif";
    for (let g = 0; g <= 4; g++) {
      const yy = pad + (H - 2 * pad) * g / 4;
      ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke();
      const val = Math.round((max - range * g / 4) * 10) / 10;
      ctx.fillText(val, 4, yy + 4);
    }
    // 计划方向参考线（起始值）
    if (plan && n > 1) {
      const base = series[0].kg;
      ctx.strokeStyle = plan === "loss" ? "#e5484d" : plan === "gain" ? "#2f6fed" : "#888";
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(pad, y(base)); ctx.lineTo(W - pad, y(base)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle; ctx.fillText("起点 " + base, W - 70, y(base) - 4);
    }
    // 折线
    ctx.strokeStyle = "#2f6fed"; ctx.lineWidth = 2.5; ctx.beginPath();
    series.forEach((s, i) => { const xx = x(i), yy = y(s.kg); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
    ctx.stroke();
    // 点 + X 标签
    ctx.fillStyle = "#2f6fed";
    series.forEach((s, i) => {
      const xx = x(i), yy = y(s.kg);
      ctx.beginPath(); ctx.arc(xx, yy, 3.5, 0, Math.PI * 2); ctx.fill();
      if (i % Math.ceil(n / 6) === 0 || i === n - 1) {
        ctx.fillStyle = "#7a869a"; ctx.font = "10px sans-serif";
        const lbl = s.date.slice(5);
        ctx.fillText(lbl, xx - 14, H - pad + 14);
        ctx.fillStyle = "#2f6fed";
      }
    });
  }

  // 多维趋势：体重(右轴) + 训练分钟 + 当日热量，按天
  function drawMultiChart() {
    const cv = $("#mChart");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height, pad = 36;
    ctx.clearRect(0, 0, W, H);
    // 按天聚合近 30 天
    const byDay = {};
    window.Store.all().forEach(r => {
      const d = window.fmtDate(r.ts);
      if (!byDay[d]) byDay[d] = { kg: null, fit: 0, kcal: 0 };
      if (r.type === "weight") byDay[d].kg = r.kg;
      if (r.type === "activity" && r.category === "健身") byDay[d].fit += (r.duration || 0);
      if (r.type === "food") byDay[d].kcal += (r.kcal || 0);
    });
    const days = Object.keys(byDay).sort().slice(-30);
    if (days.length < 2) { ctx.fillStyle = "#7a869a"; ctx.font = "13px sans-serif"; ctx.fillText("记录满 2 天以上显示多维趋势", pad, H / 2); return; }
    const series = days.map(d => byDay[d]);
    // 体重需连续：用最近已知值回填
    let lastKg = null;
    series.forEach(s => { if (s.kg != null) lastKg = s.kg; else s.kg = lastKg; });
    const kgs = series.map(s => s.kg).filter(v => v != null);
    let kMin = Math.min(...kgs), kMax = Math.max(...kgs);
    if (kMin === kMax) { kMin -= 1; kMax += 1; }
    const fitMax = Math.max(60, ...series.map(s => s.fit));
    const kcalMax = Math.max(500, ...series.map(s => s.kcal));
    const n = series.length;
    const x = i => pad + (W - 2 * pad) * i / (n - 1);
    const yKg = v => H - pad - (v - kMin) / (kMax - kMin) * (H - 2 * pad);
    const yNorm = v => H - pad - v / 1 * (H - 2 * pad); // 占位，下方分别用各自比例
    const yFit = v => H - pad - v / fitMax * (H - 2 * pad);
    const yKcal = v => H - pad - v / kcalMax * (H - 2 * pad);
    // 网格
    ctx.strokeStyle = "#e8ecf3"; ctx.fillStyle = "#7a869a"; ctx.font = "11px sans-serif";
    for (let g = 0; g <= 4; g++) { const yy = pad + (H - 2 * pad) * g / 4; ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke(); }
    // 体重右轴标签
    ctx.fillStyle = "#2f6fed";
    for (let g = 0; g <= 4; g++) { const val = Math.round((kMax - (kMax - kMin) * g / 4) * 10) / 10; ctx.fillText(val, W - 32, pad + (H - 2 * pad) * g / 4 + 4); }
    const line = (vals, color, scale) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      vals.forEach((v, i) => { const xx = x(i); const yy = scale(v); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
    };
    line(series.map(s => s.fit), "#f59e0b", yFit);
    line(series.map(s => s.kcal), "#22c55e", yKcal);
    if (kgs.length) line(series.map(s => s.kg), "#2f6fed", yKg);
    // x 标签
    ctx.fillStyle = "#7a869a"; ctx.font = "10px sans-serif";
    [0, Math.floor(n / 2), n - 1].forEach(i => { ctx.fillText(days[i].slice(5), x(i) - 14, H - pad + 14); });
  }

  // 体重弹层
  function openWeightModal() {
    openModal("记体重", `
      <div class="form">
        <label>体重 (kg)</label>
        <input id="wKg" type="number" step="0.1" placeholder="如 68.5" />
        <button id="wSubmit" class="primary wide">保存</button>
      </div>
    `);
    $("#wSubmit").addEventListener("click", () => {
      const v = parseFloat($("#wKg").value);
      if (isNaN(v) || v <= 0) { alert("请输入有效体重"); return; }
      window.Store.add(window.AI.buildWeightRecord(v));
      closeModal(); render();
    });
  }

  // ---------- 渲染：报告（周/月） ----------
  function renderReport() {
    const cfg = window.Config.get();
    const goals = cfg.goals || {};
    // 周：本周一~今天；月：本月
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 周一=0
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow);
    const period = { week: weekStart, month: new Date(now.getFullYear(), now.getMonth(), 1) };
    let mode = "week";
    const buildSummary = (start) => {
      const recs = window.Store.all().filter(r => new Date(r.ts) >= start);
      const acts = recs.filter(r => r.type === "activity");
      const fit = acts.filter(a => a.category === "健身");
      const fitMin = fit.reduce((s, a) => s + (a.duration || 0), 0);
      const foods = recs.filter(r => r.type === "food");
      const kcal = foods.reduce((s, r) => s + (r.kcal || 0), 0);
      const prot = foods.reduce((s, r) => s + (r.protein || 0), 0);
      const exps = recs.filter(r => r.type === "expense");
      const cost = exps.reduce((s, r) => s + (r.amount || 0), 0);
      const sleeps = recs.filter(r => r.type === "sleep");
      const sleepH = (sleeps.reduce((s, r) => s + (r.duration || 0), 0) / 60).toFixed(1);
      const weights = recs.filter(r => r.type === "weight").map(r => r.kg).filter(Boolean);
      const wLatest = weights.length ? weights[weights.length - 1] : null;
      const wFirst = weights.length ? weights[0] : null;
      const wDelta = (wLatest != null && wFirst != null) ? Math.round((wLatest - wFirst) * 10) / 10 : null;
      const dayCount = new Set(recs.map(r => window.fmtDate(r.ts))).size;
      const targetDays = goals.kcal ? foods.length ? Math.round(kcal / goals.kcal * foods.length) : 0 : 0;
      return { recs, fitCount: fit.length, fitMin, kcal: Math.round(kcal), prot: Math.round(prot), cost: Math.round(cost), sleepH, wLatest, wFirst, wDelta, dayCount, targetDays };
    };

    const s = buildSummary(period[mode]);
    const label = mode === "week" ? "本周" : "本月";
    $("#view").innerHTML = `
      <div class="seg">
        <button class="seg-btn on" data-mode="week">本周</button>
        <button class="seg-btn" data-mode="month">本月</button>
      </div>
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${s.fitCount}</div><div class="stat-l">训练次数</div></div>
        <div class="stat"><div class="stat-v">${Math.round(s.fitMin / 60 * 10) / 10}h</div><div class="stat-l">训练时长</div></div>
        <div class="stat"><div class="stat-v">${s.dayCount}</div><div class="stat-l">记录天数</div></div>
        <div class="stat"><div class="stat-v">${money(s.cost)}</div><div class="stat-l">花费</div></div>
        <div class="stat"><div class="stat-v">${s.sleepH}h</div><div class="stat-l">睡眠</div></div>
      </div>
      <div class="stats-row">
        <div class="stat"><div class="stat-v">${Math.round(s.kcal)}</div><div class="stat-l">总热量</div></div>
        <div class="stat"><div class="stat-v">${s.prot}g</div><div class="stat-l">总蛋白</div></div>
        <div class="stat"><div class="stat-v">${s.wLatest != null ? s.wLatest : "—"}</div><div class="stat-l">最新体重</div></div>
        <div class="stat"><div class="stat-v" style="font-size:14px">${s.wDelta != null ? (s.wDelta > 0 ? "↑" : "↓") + Math.abs(s.wDelta) : "—"}</div><div class="stat-l">体重变化</div></div>
      </div>
      <div class="summary-box">
        <div class="summary-head">📈 ${label}报告</div>
        <div id="reportText" class="summary-text">点击下方按钮生成 AI ${label}总结。</div>
        <button id="btnReport" class="ghost small">生成${label}总结</button>
        <button id="btnReportImg" class="ghost small">导出${label}图片</button>
      </div>
    `;
    $$(".seg-btn").forEach(b => b.addEventListener("click", () => {
      $$(".seg-btn").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      mode = b.getAttribute("data-mode");
      renderReport();
    }));
    $("#btnReport").addEventListener("click", async () => {
      const st = $("#reportText");
      st.textContent = "生成中…";
      const sum = `记录天数${s.dayCount}、训练${s.fitCount}次/共${Math.round(s.fitMin / 60 * 10) / 10}h、总热量${s.kcal}kcal、总蛋白${s.prot}g、花费¥${s.cost}、平均睡眠${s.sleepH}h、体重${s.wFirst != null ? s.wFirst + "→" + s.wLatest + "(Δ" + s.wDelta + ")" : "无"}。`;
      try {
        const text = await window.AI.generateReport(s.recs, mode === "week" ? "本周" : "本月", sum);
        st.textContent = text;
      } catch (e) {
        st.textContent = "⚠️ " + e.message;
      }
    });
    $("#btnReportImg").addEventListener("click", () => exportReportImage(s, label));
  }

  // 把报告渲染成图片并下载（canvas 合成）
  function exportReportImage(s, label) {
    const c = document.createElement("canvas");
    c.width = 600; c.height = 760;
    const x = c.getContext("2d");
    x.fillStyle = "#f5f7fb"; x.fillRect(0, 0, 600, 760);
    x.fillStyle = "#2f6fed"; x.fillRect(0, 0, 600, 90);
    x.fillStyle = "#fff"; x.font = "bold 28px sans-serif"; x.fillText("LifeLog " + label + "报告", 24, 56);
    x.fillStyle = "#1c2430"; x.font = "16px sans-serif";
    const lines = [
      "记录天数：" + s.dayCount + " 天",
      "训练：" + s.fitCount + " 次 / 共 " + (Math.round(s.fitMin / 60 * 10) / 10) + " 小时",
      "总热量：" + s.kcal + " kcal    总蛋白：" + s.prot + " g",
      "花费：¥" + s.cost + "    平均睡眠：" + s.sleepH + " h",
      "体重：" + (s.wFirst != null ? s.wFirst + " → " + s.wLatest + " kg (Δ" + s.wDelta + ")" : "无记录")
    ];
    let y = 140;
    lines.forEach(t => { x.fillText(t, 24, y); y += 34; });
    x.fillStyle = "#7a869a"; x.font = "13px sans-serif";
    x.fillText("生成于 " + new Date().toLocaleString(), 24, y + 10);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "lifelog-" + label + "-" + window.fmtDate(Date.now()) + ".png";
    a.click();
  }

  function render() {
    if (currentTab === "today") renderToday();
    else if (currentTab === "month") renderMonth();
    else if (currentTab === "food") renderFood();
    else if (currentTab === "weight") renderWeight();
    else if (currentTab === "report") renderReport();
    else if (currentTab === "settings") renderSettings();
  }

  function bindTabs() {
    $$(".tab").forEach(t => t.addEventListener("click", () => {
      $$(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      currentTab = t.getAttribute("data-tab");
      render();
    }));
  }

  // ---------- 启动 ----------
  function init() {
    const d = new Date();
    $("#todayLabel").textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    $("#btnParse").addEventListener("click", handleParse);
    $("#btnManual").addEventListener("click", openFoodModal);
    $("#modalClose").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
    bindTabs();
    startReminderChecker();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
