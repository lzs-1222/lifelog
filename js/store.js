// 本地存储层：使用 localStorage 持久化所有记录
// 记录统一结构：
//   { id, type, ts, ...fields }
//   type: 'activity' | 'expense' | 'food' | 'sleep' | 'weight' | 'body'
//   activity: { category, note, duration(分钟,可选) }
//   expense:  { amount, category, note }
//   food:     { name, qty(克或份), kcal, protein, carb, fat, meal(早/午/晚/加餐) }
//   sleep:    { kind:'night'|'nap', sleepAt(夜:入睡HH:MM), wakeAt(夜:起床HH:MM), duration(分钟,午睡用), note }
//   weight:   { kg(数字) }
//   body:     { metric:'waist'|'chest'|'arm'|'thigh'|'fat'(体脂率%), value(数字), unit }
//
// 计划与目标存于 Config：
//   plan: 'gain' | 'loss' | 'keep' | ''
//   goals: { kcal, protein, carb, fat }  (每日饮食目标，0 表示未设)
(function () {
  const KEY = "lifelog_records_v1";
  const CFG = "lifelog_config_v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function save(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  const Store = {
    all() {
      return load().sort((a, b) => b.ts - a.ts);
    },
    add(rec) {
      const arr = load();
      rec.id = rec.id || (Date.now() + "_" + Math.random().toString(36).slice(2, 7));
      rec.ts = rec.ts || Date.now();
      arr.push(rec);
      save(arr);
      return rec;
    },
    remove(id) {
      save(load().filter(r => r.id !== id));
    },
    update(id, patch) {
      const arr = load();
      const i = arr.findIndex(r => r.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); save(arr); }
      return arr[i];
    },
    // 按某天(yyyy-mm-dd)过滤
    byDate(dateStr) {
      return this.all().filter(r => fmtDate(r.ts) === dateStr);
    },
    // 按某月(yyyy-mm)过滤
    byMonth(monthStr) {
      return this.all().filter(r => fmtMonth(r.ts) === monthStr);
    },
    clear() { save([]); }
  };

  // 配置（API Key 等）
  const Config = {
    get() {
      try { return JSON.parse(localStorage.getItem(CFG) || "{}"); }
      catch (e) { return {}; }
    },
    set(patch) {
      const c = Object.assign(this.get(), patch);
      localStorage.setItem(CFG, JSON.stringify(c));
      return c;
    }
  };

  function fmtDate(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function fmtMonth(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  window.Store = Store;
  window.Config = Config;
  window.fmtDate = fmtDate;
  window.fmtMonth = fmtMonth;
})();
