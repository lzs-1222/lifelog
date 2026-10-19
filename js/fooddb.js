// 本地营养食物库
// 数值为每 100g / 每份 的热量(kcal)、蛋白质(g)、碳水(g)、脂肪(g)
// unit: '100g' 表示按每100克计；'serving' 表示按“份/个”计（见 portion）
// 常见份量 portion 用于“1个鸡蛋”“1杯牛奶”这类口语解析
window.FOOD_DB = [
  // ---- 蛋奶类 ----
  { name: "鸡蛋", alias: ["鸡卵", "蛋"], unit: "serving", portion: 50, kcal: 78, protein: 6.3, carb: 0.6, fat: 5.3 },
  { name: "鸡蛋白", alias: ["蛋白"], unit: "serving", portion: 33, kcal: 17, protein: 3.6, carb: 0.2, fat: 0.1 },
  { name: "蛋黄", alias: [], unit: "serving", portion: 17, kcal: 55, protein: 2.7, carb: 0.3, fat: 4.5 },
  { name: "牛奶", alias: ["鲜奶"], unit: "serving", portion: 250, kcal: 150, protein: 7.5, carb: 11, fat: 8 },
  { name: "全脂牛奶", alias: [], unit: "100g", kcal: 64, protein: 3.2, carb: 4.8, fat: 3.6 },
  { name: "脱脂牛奶", alias: [], unit: "100g", kcal: 33, protein: 3.4, carb: 5, fat: 0.1 },
  { name: "酸奶", alias: ["酸奶"], unit: "100g", kcal: 72, protein: 3.2, carb: 9, fat: 2.7 },
  { name: "希腊酸奶", alias: ["greek yogurt"], unit: "100g", kcal: 59, protein: 10, carb: 3.6, fat: 0.4 },
  { name: "奶酪", alias: ["芝士", "起司"], unit: "100g", kcal: 328, protein: 25, carb: 3.5, fat: 24 },
  { name: "黄油", alias: ["牛油"], unit: "100g", kcal: 717, protein: 0.9, carb: 0.1, fat: 81 },
  { name: "冰淇淋", alias: ["雪糕"], unit: "100g", kcal: 207, protein: 3.5, carb: 24, fat: 11 },

  // ---- 肉类 ----
  { name: "鸡胸肉", alias: ["鸡胸"], unit: "100g", kcal: 133, protein: 31, carb: 0, fat: 1.9 },
  { name: "鸡腿肉", alias: [], unit: "100g", kcal: 187, protein: 24, carb: 0, fat: 9.7 },
  { name: "牛肉", alias: ["牛排"], unit: "100g", kcal: 250, protein: 26, carb: 0, fat: 15 },
  { name: "牛里脊", alias: [], unit: "100g", kcal: 150, protein: 22, carb: 0, fat: 6 },
  { name: "猪肉", alias: ["五花肉"], unit: "100g", kcal: 271, protein: 19, carb: 0, fat: 21 },
  { name: "猪里脊", alias: [], unit: "100g", kcal: 155, protein: 22, carb: 0, fat: 7 },
  { name: "羊肉", alias: [], unit: "100g", kcal: 294, protein: 25, carb: 0, fat: 21 },
  { name: "鸭肉", alias: [], unit: "100g", kcal: 240, protein: 18, carb: 0, fat: 18 },
  { name: "火腿", alias: [], unit: "100g", kcal: 145, protein: 16, carb: 1.5, fat: 8 },
  { name: "培根", alias: [], unit: "100g", kcal: 541, protein: 37, carb: 1.4, fat: 42 },
  { name: "香肠", alias: ["烤肠"], unit: "100g", kcal: 301, protein: 12, carb: 2, fat: 27 },
  { name: "虾", alias: ["大虾", "虾仁"], unit: "100g", kcal: 99, protein: 21, carb: 0.2, fat: 1.4 },
  { name: "三文鱼", alias: ["鲑鱼"], unit: "100g", kcal: 208, protein: 20, carb: 0, fat: 13 },
  { name: "金枪鱼", alias: [], unit: "100g", kcal: 132, protein: 28, carb: 0, fat: 1 },
  { name: "鳕鱼", alias: [], unit: "100g", kcal: 82, protein: 18, carb: 0, fat: 0.7 },
  { name: "鲈鱼", alias: [], unit: "100g", kcal: 105, protein: 19, carb: 0, fat: 3 },
  { name: "螃蟹", alias: [], unit: "100g", kcal: 97, protein: 19, carb: 0, fat: 1.5 },
  { name: "鱿鱼", alias: ["枪乌贼"], unit: "100g", kcal: 92, protein: 15, carb: 2, fat: 1.4 },
  { name: "贻贝", alias: ["青口"], unit: "100g", kcal: 86, protein: 12, carb: 4, fat: 2 },

  // ---- 主食/谷物 ----
  { name: "米饭", alias: ["白米饭", "大米饭"], unit: "100g", kcal: 116, protein: 2.6, carb: 25.9, fat: 0.3 },
  { name: "糙米饭", alias: [], unit: "100g", kcal: 123, protein: 2.8, carb: 25, fat: 1 },
  { name: "馒头", alias: [], unit: "serving", portion: 100, kcal: 223, protein: 7, carb: 47, fat: 1.1 },
  { name: "面条", alias: ["面"], unit: "100g", kcal: 138, protein: 4.5, carb: 27, fat: 0.9 },
  { name: "意大利面", alias: ["意面", "pasta"], unit: "100g", kcal: 158, protein: 5.8, carb: 31, fat: 0.9 },
  { name: "面包", alias: ["吐司"], unit: "100g", kcal: 265, protein: 9, carb: 49, fat: 3.2 },
  { name: "全麦面包", alias: [], unit: "100g", kcal: 247, protein: 13, carb: 41, fat: 3.4 },
  { name: "燕麦", alias: ["燕麦片"], unit: "100g", kcal: 389, protein: 17, carb: 66, fat: 7 },
  { name: "小米粥", alias: [], unit: "100g", kcal: 46, protein: 1.4, carb: 9, fat: 0.5 },
  { name: "粥", alias: ["白粥"], unit: "100g", kcal: 46, protein: 1.1, carb: 9.8, fat: 0.3 },
  { name: "饺子", alias: [], unit: "serving", portion: 25, kcal: 50, protein: 2.1, carb: 7, fat: 1.5 },
  { name: "包子", alias: [], unit: "serving", portion: 100, kcal: 227, protein: 8, carb: 40, fat: 3.5 },
  { name: "油条", alias: [], unit: "serving", portion: 70, kcal: 270, protein: 6, carb: 36, fat: 12 },
  { name: "饼干", alias: ["曲奇"], unit: "100g", kcal: 433, protein: 7, carb: 65, fat: 16 },
  { name: "蛋糕", alias: [], unit: "100g", kcal: 347, protein: 6, carb: 52, fat: 13 },
  { name: "煎饼", alias: [], unit: "serving", portion: 100, kcal: 200, protein: 7, carb: 30, fat: 6 },

  // ---- 豆制品 ----
  { name: "豆腐", alias: [], unit: "100g", kcal: 76, protein: 8, carb: 1.9, fat: 4.8 },
  { name: "豆浆", alias: [], unit: "100g", kcal: 31, protein: 3, carb: 1.2, fat: 1.6 },
  { name: "黄豆", alias: ["大豆"], unit: "100g", kcal: 390, protein: 35, carb: 34, fat: 16 },
  { name: "绿豆", alias: [], unit: "100g", kcal: 347, protein: 24, carb: 63, fat: 0.8 },
  { name: "红豆", alias: [], unit: "100g", kcal: 324, protein: 20, carb: 63, fat: 0.6 },
  { name: "腐竹", alias: [], unit: "100g", kcal: 459, protein: 45, carb: 22, fat: 22 },
  { name: "素鸡", alias: [], unit: "100g", kcal: 194, protein: 17, carb: 4, fat: 12 },

  // ---- 蔬菜 ----
  { name: "西兰花", alias: [], unit: "100g", kcal: 34, protein: 2.8, carb: 7, fat: 0.4 },
  { name: "菠菜", alias: [], unit: "100g", kcal: 23, protein: 2.9, carb: 3.6, fat: 0.4 },
  { name: "白菜", alias: ["大白菜"], unit: "100g", kcal: 17, protein: 1.5, carb: 3.2, fat: 0.1 },
  { name: "黄瓜", alias: [], unit: "100g", kcal: 15, protein: 0.7, carb: 3.6, fat: 0.1 },
  { name: "番茄", alias: ["西红柿"], unit: "100g", kcal: 18, protein: 0.9, carb: 3.9, fat: 0.2 },
  { name: "土豆", alias: ["马铃薯"], unit: "100g", kcal: 77, protein: 2, carb: 17, fat: 0.1 },
  { name: "胡萝卜", alias: [], unit: "100g", kcal: 41, protein: 0.9, carb: 10, fat: 0.2 },
  { name: "玉米", alias: [], unit: "100g", kcal: 86, protein: 3.2, carb: 19, fat: 1.2 },
  { name: "茄子", alias: [], unit: "100g", kcal: 25, protein: 1, carb: 6, fat: 0.2 },
  { name: "青椒", alias: ["甜椒"], unit: "100g", kcal: 20, protein: 0.9, carb: 4.6, fat: 0.2 },
  { name: "洋葱", alias: [], unit: "100g", kcal: 40, protein: 1.1, carb: 9, fat: 0.1 },
  { name: "生菜", alias: [], unit: "100g", kcal: 15, protein: 1.4, carb: 2.9, fat: 0.2 },
  { name: "蘑菇", alias: ["香菇", "口蘑"], unit: "100g", kcal: 22, protein: 3.1, carb: 3.3, fat: 0.3 },
  { name: "南瓜", alias: [], unit: "100g", kcal: 26, protein: 1, carb: 7, fat: 0.1 },
  { name: "冬瓜", alias: [], unit: "100g", kcal: 12, protein: 0.4, carb: 2.9, fat: 0.2 },
  { name: "芹菜", alias: [], unit: "100g", kcal: 16, protein: 0.7, carb: 3.4, fat: 0.2 },

  // ---- 水果 ----
  { name: "苹果", alias: [], unit: "serving", portion: 180, kcal: 95, protein: 0.5, carb: 25, fat: 0.3 },
  { name: "香蕉", alias: [], unit: "serving", portion: 120, kcal: 107, protein: 1.3, carb: 27, fat: 0.4 },
  { name: "橙子", alias: ["柳橙"], unit: "serving", portion: 130, kcal: 62, protein: 1.2, carb: 15, fat: 0.2 },
  { name: "梨", alias: [], unit: "serving", portion: 180, kcal: 100, protein: 0.5, carb: 27, fat: 0.1 },
  { name: "葡萄", alias: [], unit: "100g", kcal: 69, protein: 0.7, carb: 18, fat: 0.2 },
  { name: "草莓", alias: [], unit: "100g", kcal: 32, protein: 0.7, carb: 7.7, fat: 0.3 },
  { name: "西瓜", alias: [], unit: "100g", kcal: 30, protein: 0.6, carb: 7.6, fat: 0.2 },
  { name: "蓝莓", alias: [], unit: "100g", kcal: 57, protein: 0.7, carb: 14, fat: 0.3 },
  { name: "猕猴桃", alias: ["奇异果"], unit: "serving", portion: 75, kcal: 42, protein: 0.8, carb: 10, fat: 0.4 },
  { name: "芒果", alias: [], unit: "100g", kcal: 60, protein: 0.8, carb: 15, fat: 0.4 },
  { name: "菠萝", alias: [], unit: "100g", kcal: 50, protein: 0.5, carb: 13, fat: 0.1 },
  { name: "桃子", alias: [], unit: "serving", portion: 150, kcal: 59, protein: 1, carb: 14, fat: 0.4 },
  { name: "柚子", alias: [], unit: "100g", kcal: 42, protein: 0.8, carb: 10, fat: 0.2 },

  // ---- 坚果/零食 ----
  { name: "花生", alias: [], unit: "100g", kcal: 567, protein: 26, carb: 16, fat: 49 },
  { name: "核桃", alias: [], unit: "100g", kcal: 654, protein: 15, carb: 14, fat: 65 },
  { name: "杏仁", alias: ["巴旦木"], unit: "100g", kcal: 579, protein: 21, carb: 22, fat: 50 },
  { name: "腰果", alias: [], unit: "100g", kcal: 553, protein: 18, carb: 30, fat: 44 },
  { name: "瓜子", alias: ["葵花籽"], unit: "100g", kcal: 584, protein: 24, carb: 20, fat: 49 },
  { name: "巧克力", alias: [], unit: "100g", kcal: 546, protein: 4.9, carb: 61, fat: 31 },
  { name: "薯片", alias: [], unit: "100g", kcal: 536, protein: 7, carb: 53, fat: 33 },
  { name: "奶茶", alias: [], unit: "serving", portion: 500, kcal: 350, protein: 3, carb: 55, fat: 12 },
  { name: "可乐", alias: [], unit: "serving", portion: 330, kcal: 139, protein: 0, carb: 35, fat: 0 },
  { name: "果汁", alias: [], unit: "serving", portion: 250, kcal: 115, protein: 0.5, carb: 28, fat: 0.2 },

  // ---- 饮品/其他 ----
  { name: "咖啡", alias: ["美式"], unit: "serving", portion: 240, kcal: 5, protein: 0.3, carb: 0, fat: 0 },
  { name: "拿铁", alias: [], unit: "serving", portion: 240, kcal: 120, protein: 6, carb: 11, fat: 6 },
  { name: "绿茶", alias: [], unit: "serving", portion: 240, kcal: 2, protein: 0, carb: 0, fat: 0 },
  { name: "啤酒", alias: [], unit: "serving", portion: 330, kcal: 142, protein: 1, carb: 13, fat: 0 },
  { name: "红酒", alias: [], unit: "serving", portion: 150, kcal: 125, protein: 0.1, carb: 4, fat: 0 },
  { name: "白酒", alias: [], unit: "serving", portion: 50, kcal: 145, protein: 0, carb: 0.1, fat: 0 },
  { name: "蜂蜜", alias: [], unit: "100g", kcal: 304, protein: 0.3, carb: 82, fat: 0 },
  { name: "糖", alias: ["白糖"], unit: "100g", kcal: 387, protein: 0, carb: 100, fat: 0 },
  { name: "橄榄油", alias: [], unit: "100g", kcal: 884, protein: 0, carb: 0, fat: 100 },
  { name: "酱油", alias: [], unit: "100g", kcal: 53, protein: 8, carb: 4.9, fat: 0.1 },
  { name: "沙拉酱", alias: [], unit: "100g", kcal: 460, protein: 1, carb: 8, fat: 47 },

  // ---- 快餐/外卖常见 ----
  { name: "汉堡", alias: [], unit: "serving", portion: 200, kcal: 500, protein: 25, carb: 40, fat: 25 },
  { name: "披萨", alias: [], unit: "serving", portion: 100, kcal: 266, protein: 11, carb: 33, fat: 10 },
  { name: "炸鸡", alias: [], unit: "100g", kcal: 320, protein: 18, carb: 15, fat: 22 },
  { name: "牛肉面", alias: [], unit: "serving", portion: 500, kcal: 550, protein: 25, carb: 70, fat: 18 },
  { name: "麻辣烫", alias: [], unit: "serving", portion: 500, kcal: 450, protein: 20, carb: 50, fat: 18 },
  { name: "螺蛳粉", alias: [], unit: "serving", portion: 500, kcal: 550, protein: 12, carb: 90, fat: 15 },
  { name: "炒饭", alias: [], unit: "serving", portion: 300, kcal: 450, protein: 12, carb: 70, fat: 14 },
  { name: "盖浇饭", alias: [], unit: "serving", portion: 500, kcal: 600, protein: 25, carb: 80, fat: 20 },
  { name: "寿司", alias: [], unit: "serving", portion: 200, kcal: 350, protein: 15, carb: 60, fat: 6 },
  { name: "拉面", alias: [], unit: "serving", portion: 500, kcal: 480, protein: 20, carb: 75, fat: 12 }
];

// 简单搜索：按名称或别名匹配，返回食物对象或 null
window.findFood = function (text) {
  const t = (text || "").trim();
  if (!t) return null;
  for (const f of window.FOOD_DB) {
    if (f.name === t || f.alias.includes(t)) return f;
  }
  // 模糊：包含名称或别名
  for (const f of window.FOOD_DB) {
    if (t.includes(f.name) || f.alias.some(a => t.includes(a))) return f;
  }
  return null;
};
