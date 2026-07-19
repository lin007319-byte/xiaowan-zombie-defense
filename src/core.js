(function (root, factory) {
  const catalog = root.FusionCatalog || (typeof module !== "undefined" && module.exports ? require("./fusion-catalog.js") : null);
  const api = factory(catalog);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FusionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Catalog) {
  "use strict";

  const PLANTS = {
    pea: { id: "pea", name: "豌豆射手", short: "豌豆", cost: 100, cooldown: 4, body: "shooter", gene: "shooter", hp: 300, damage: 26, interval: 1.25, color: "#78d85f" },
    sun: { id: "sun", name: "向日葵", short: "向日葵", cost: 50, cooldown: 4, body: "producer", gene: "producer", hp: 300, interval: 7, color: "#ffd85f" },
    cherry: { id: "cherry", name: "樱桃炸弹", short: "樱桃", cost: 150, cooldown: 12, body: "burst", gene: "burst", hp: 300, damage: 900, interval: .8, color: "#ef5c61" },
    nut: { id: "nut", name: "坚果墙", short: "坚果", cost: 50, cooldown: 8, body: "guard", gene: "guard", hp: 4000, color: "#bd824b" },
    potato: { id: "potato", name: "土豆地雷", short: "土豆雷", cost: 25, cooldown: 12, body: "burst", gene: "burst", hp: 300, damage: 900, interval: 1.4, color: "#9a6b3f" },
    frost: { id: "frost", name: "寒冰射手", short: "寒冰", cost: 150, cooldown: 6, body: "shooter", gene: "frost", hp: 300, damage: 20, interval: 1.5, color: "#70d7e8" },
    chomper: { id: "chomper", name: "大嘴花", short: "大嘴花", cost: 150, cooldown: 7.5, body: "melee", gene: "devour", hp: 300, damage: 500, interval: 8, color: "#b04f9f" },
    gloom: { id: "gloom", name: "忧郁菇", short: "忧郁菇", cost: 150, cooldown: 7, body: "shooter", gene: "radial", hp: 300, damage: 28, interval: 1.35, color: "#7650a8" },
    puff: { id: "puff", name: "小喷菇", short: "小喷菇", cost: 0, cooldown: 4, body: "shooter", gene: "pierce", hp: 300, damage: 12, interval: 1.05, color: "#b58ed2" },
    sunshroom: { id: "sunshroom", name: "阳光菇", short: "阳光菇", cost: 25, cooldown: 5, body: "producer", gene: "producer", hp: 300, interval: 8.5, color: "#f0c95d" },
    fume: { id: "fume", name: "大蘑菇", short: "大蘑菇", cost: 75, cooldown: 5, body: "shooter", gene: "pierce", hp: 300, damage: 24, interval: 1.45, color: "#9b74c5" },
    hypno: { id: "hypno", name: "魅惑菇", short: "魅惑菇", cost: 75, cooldown: 10, body: "guard", gene: "weaken", hp: 900, color: "#e07bba" },
    iceShroom: { id: "iceShroom", name: "寒冰菇", short: "寒冰菇", cost: 125, cooldown: 18, body: "burst", gene: "deepfreeze", hp: 320, damage: 60, interval: .9, color: "#83ddf4" },
    doom: { id: "doom", name: "毁灭菇", short: "毁灭菇", cost: 200, cooldown: 20, body: "burst", gene: "nova", hp: 320, damage: 1380, interval: 1.15, color: "#6f45d8" },
    lilypad: { id: "lilypad", name: "荷叶", short: "荷叶", cost: 25, cooldown: 4, body: "guard", gene: "armor", hp: 300, color: "#66b96e" },
    pepper: { id: "pepper", name: "火爆辣椒", short: "辣椒", cost: 175, cooldown: 14, body: "burst", gene: "fire", hp: 300, damage: 620, interval: .8, color: "#ff704d" },
    spikeweed: { id: "spikeweed", name: "地刺", short: "地刺", cost: 100, cooldown: 7.5, body: "trap", gene: "spike", hp: 300, damage: 24, interval: .65, color: "#468c59" },
    torchwood: { id: "torchwood", name: "火炬树桩", short: "火炬", cost: 175, cooldown: 7.5, body: "support", gene: "ignite", hp: 300, interval: 4.5, color: "#e88a43" },
    tallnut: { id: "tallnut", name: "高坚果", short: "高坚果", cost: 125, cooldown: 50, body: "guard", gene: "tall", hp: 8000, color: "#b77b42" },
    lantern: { id: "lantern", name: "路灯花", short: "路灯花", cost: 75, cooldown: 6, body: "producer", gene: "reveal", hp: 460, interval: 7.5, color: "#ffd35a" },
    cactus: { id: "cactus", name: "仙人掌", short: "仙人掌", cost: 100, cooldown: 5, body: "shooter", gene: "crit", hp: 300, damage: 28, interval: 1.5, color: "#59bd74" },
    blover: { id: "blover", name: "三叶草", short: "三叶草", cost: 100, cooldown: 7.5, body: "burst", gene: "gust", hp: 300, damage: 120, interval: .7, color: "#80d69a" },
    star: { id: "star", name: "杨桃", short: "杨桃", cost: 150, cooldown: 7, body: "shooter", gene: "radial", hp: 380, damage: 21, interval: 1.18, color: "#ffc94d" },
    pumpkin: { id: "pumpkin", name: "南瓜", short: "南瓜", cost: 125, cooldown: 9, body: "guard", gene: "armor", hp: 3800, color: "#e8923b" },
    magnet: { id: "magnet", name: "磁力菇", short: "磁力菇", cost: 100, cooldown: 8, body: "support", gene: "magnet", hp: 300, interval: 6.5, color: "#ef5f57" },
    cabbage: { id: "cabbage", name: "卷心菜投手", short: "卷心菜", cost: 100, cooldown: 5, body: "shooter", gene: "splash", hp: 300, damage: 30, interval: 1.65, color: "#79bd55" },
    corn: { id: "corn", name: "玉米投手", short: "玉米", cost: 125, cooldown: 5, body: "shooter", gene: "stun", hp: 300, damage: 24, interval: 1.55, color: "#f2c94c" },
    garlic: { id: "garlic", name: "大蒜", short: "大蒜", cost: 50, cooldown: 7, body: "guard", gene: "weaken", hp: 1900, color: "#ede2bd" },
    umbrella: { id: "umbrella", name: "叶子保护伞", short: "保护伞", cost: 100, cooldown: 7, body: "guard", gene: "armor", hp: 2400, color: "#75bd68" },
    melon: { id: "melon", name: "西瓜投手", short: "西瓜", cost: 175, cooldown: 7, body: "shooter", gene: "splash", hp: 300, damage: 44, interval: 2.1, color: "#67bf66" }
  };

  /* Previous free-form recipes removed: the supplied 65-plant document is now authoritative. */
  const LEGACY_RECIPES = {
    "sun>pea": { name: "阳光豌豆", note: "阳光弹命中后有概率长出小阳光", tone: "gold" },
    "pea>sun": { name: "豆荚花盘", note: "每次产阳光时向危险路线发射种子", tone: "gold" },
    "nut>pea": { name: "坚果炮台", note: "获得坚果护盾，破盾后短暂狂热", tone: "gold" },
    "pea>nut": { name: "豌豆坚果", note: "受击积蓄反击豌豆", tone: "gold" },
    "cherry>pea": { name: "爆豆射手", note: "每第六发变为爆裂豌豆", tone: "gold" },
    "pea>cherry": { name: "豌豆霰爆", note: "爆炸前喷射一轮豌豆", tone: "gold" },
    "frost>pea": { name: "双寒射手", note: "连续命中会短暂冻结目标", tone: "gold" },
    "pea>frost": { name: "冰晶连射", note: "寒冰弹附带一枚低伤害追弹", tone: "gold" },
    "sun>nut": { name: "太阳能坚果", note: "损失耐久时掉落小阳光", tone: "gold" },
    "nut>sun": { name: "温室花盘", note: "护盾存在时产能更快", tone: "gold" },
    "cherry>nut": { name: "爆心坚果", note: "被击破时发动终末爆炸", tone: "gold" },
    "frost>nut": { name: "冻土坚果", note: "啃咬者会被持续减速", tone: "gold" },
    "corn>pea": { name: "玉米连荚", note: "豌豆弹有概率把僵尸定在原地", tone: "gold" },
    "pea>corn": { name: "豆粒投手", note: "玉米弹会分裂出一枚追击豌豆", tone: "gold" },
    "frost>corn": { name: "冰糖玉米", note: "定身同时附带寒冰减速", tone: "gold" },
    "pepper>nut": { name: "熔芯坚果", note: "坚果被击破时灼烧整条路线", tone: "gold" },
    "fume>sun": { name: "阳光大蘑菇", note: "产阳光时射出穿透孢子", tone: "gold" },
    "sun>fume": { name: "日光喷菇", note: "孢子命中后生成微光阳光", tone: "gold" },
    "doom>pea": { name: "末日孢子炮", note: "每第十发产生暗能爆破", tone: "gold" },
    "iceShroom>star": { name: "极光杨桃", note: "五向星弹附带深度冻结", tone: "gold" },
    "star>lantern": { name: "星轨路灯", note: "产能时向多条路线发射光星", tone: "gold" },
    "magnet>nut": { name: "磁甲坚果", note: "周期剥离附近僵尸的金属护甲", tone: "gold" },
    "lantern>cactus": { name: "探照仙人掌", note: "光刺可击落飞行僵尸并提高暴击", tone: "gold" },
    "torchwood>pea": { name: "火炬豌豆", note: "豌豆出生即点燃并造成双倍伤害", tone: "gold" },
    "chomper>nut": { name: "吞噬坚果", note: "防御时周期吞掉面前的小型僵尸", tone: "gold" },
    "blover>star": { name: "风暴杨桃", note: "星弹带有击退气流并可击落飞行僵尸", tone: "gold" },
    "spikeweed>tallnut": { name: "荆棘高墙", note: "高墙被啃咬时反弹地刺伤害", tone: "gold" }
  };

  const RANK_DAMAGE = [1, 1.35, 1.85];
  const RANK_HP = [1, 1.25, 1.6];
  void LEGACY_RECIPES;
  const FUSIONS = Catalog?.FUSIONS || {};
  const FUSION_RECIPES = Catalog?.RECIPES || {};
  const DOCUMENT_OVERRIDES = {
    fusion08: { body: "burst", interval: 1.4 },
    fusion10: { body: "melee", interval: 30 },
    fusion12: { body: "melee", interval: 40 },
    fusion17: { body: "trap", interval: .25 },
    fusion22: { body: "shooter", interval: 30 },
    fusion32: { body: "trap", interval: 1 },
    fusion33: { body: "trap", interval: 1 }
  };
  for (const [id, override] of Object.entries(DOCUMENT_OVERRIDES)) if (FUSIONS[id]) Object.assign(FUSIONS[id], override);
  const pairKey = (a, b) => [a, b].sort().join("|");

  function unique(arr) { return [...new Set(arr)]; }

  function previewFusion(donor, host) {
    if (!donor || !host || donor.uid === host.uid) return { valid: false, reason: "请选择另一株植物" };
    if (donor.fusionId || host.fusionId) return { valid: false, reason: "普通融合植物不能继续叠加融合" };
    const fusionId = FUSION_RECIPES[pairKey(donor.baseId, host.baseId)];
    const fusion = FUSIONS[fusionId];
    if (!fusion) return { valid: false, reason: "该组合不在配方文件中" };
    return {
      valid: true,
      fusionId,
      fusion,
      baseId: fusion.baseId,
      authored: true,
      name: fusion.name,
      note: fusion.description.length > 72 ? `${fusion.description.slice(0, 70)}…` : fusion.description,
      tone: "gold"
    };
  }

  function geneName(id) {
    return ({ shooter: "射击", producer: "产能", guard: "防御", frost: "寒冰", burst: "爆破", stun: "定身", fire: "灼烧", pierce: "穿透", crit: "暴击", weaken: "虚弱", haste: "加速", splash: "溅射", multishot: "连射", heal: "治疗", armor: "重甲", nova: "湮灭", deepfreeze: "极寒", radial: "星散", reveal: "照明", magnet: "磁力", devour: "吞噬", ignite: "点燃", tall: "高墙", gust: "风暴", spike: "尖刺" })[id] || id;
  }

  function fuse(donor, host) {
    const preview = previewFusion(donor, host);
    if (!preview.valid) return { ok: false, preview };
    const oldRatio = host.maxHp > 0 ? Math.max(0, host.hp / host.maxHp) : 1;
    const fusion = preview.fusion;
    host.fusionId = fusion.id;
    host.baseId = fusion.baseId;
    host.genes = unique(fusion.traits || []);
    host.materialIds = unique((fusion.materialIds || []).filter(Boolean));
    host.geneLevels = Object.fromEntries(host.genes.map(gene => [gene, 1]));
    host.displayName = fusion.name;
    host.rank = 1;
    host.maxHp = fusion.hp;
    host.hp = Math.min(host.maxHp, Math.round(host.maxHp * oldRatio + host.maxHp * .12));
    host.shield = Math.min(host.maxHp * .35, (host.genes.includes("armor") ? 900 : 0) + (host.genes.includes("guard") ? 600 : 0));
    host.timer = fusion.interval || 1;
    host.detonate = fusion.body === "burst" ? .8 : undefined;
    host.attackCount = 0;
    host.fusions = (host.fusions || 0) + 1;
    return { ok: true, preview, host };
  }

  function createPlant(baseId, uid, row, col) {
    const d = PLANTS[baseId];
    return {
      uid, baseId, fusionId: null, row, col, rank: 1, genes: [], materialIds: [], geneLevels: {}, displayName: d.name,
      hp: d.hp, maxHp: d.hp, shield: 0, timer: d.interval || 1, attackCount: 0,
      age: 0, hitFlash: 0, attackAnim: 0, bob: Math.random() * 6, fusions: 0, alive: true
    };
  }

  function damageFor(plant) {
    const d = plant.fusionId ? FUSIONS[plant.fusionId] : PLANTS[plant.baseId];
    return Math.round((d.damage || 0) * RANK_DAMAGE[plant.rank - 1]);
  }

  function plantDef(plant) { return plant?.fusionId ? FUSIONS[plant.fusionId] : PLANTS[plant?.baseId]; }

  return { PLANTS, FUSIONS, FUSION_RECIPES, RANK_DAMAGE, RANK_HP, previewFusion, fuse, createPlant, damageFor, plantDef, geneName };
});
