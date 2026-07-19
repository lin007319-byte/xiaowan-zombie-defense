import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const BaseCatalog = require("../src/fusion-catalog.js");
const BaseFusions = Object.fromEntries(Object.entries(BaseCatalog.FUSIONS).filter(([id]) => id.startsWith("fusion")));
const BaseRecipes = Object.fromEntries(Object.entries(BaseCatalog.RECIPES).filter(([, id]) => id.startsWith("fusion")));
const attachment = process.argv[2];
if (!attachment) throw new Error("请提供包含 Wiki 链接的 PDF 文件路径");

const pdfText = fs.readFileSync(attachment, "latin1");
const names = [...pdfText.matchAll(/\/URI \((https?:\/\/[^)]*)\)/g)]
  .map(match => decodeURIComponent(match[1].split("/").pop()))
  .filter((name, index, all) => all.indexOf(name) === index);
if (!names.length) throw new Error("PDF 中没有找到植物 Wiki 链接");

const chunks = [];
for (let i = 0; i < names.length; i += 35) chunks.push(names.slice(i, i + 35));
const wikiByName = new Map();
for (const titles of chunks) {
  const body = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: titles.join("|"),
    format: "json",
    formatversion: "2",
  });
  const response = await fetch("https://wiki.biligame.com/pvzrh/api.php", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "xiaowan-zombie-defense-catalog/4.4" },
    body,
  });
  if (!response.ok) throw new Error(`Wiki 请求失败：${response.status}`);
  const json = await response.json();
  for (const page of json.query?.pages || []) {
    const source = page.revisions?.[0]?.slots?.main?.content || "";
    wikiByName.set(page.title, source);
  }
}

function fieldsFrom(source) {
  const fields = {};
  let key = "";
  for (const line of source.split(/\r?\n/)) {
    const found = line.match(/^\|([^=]+)=(.*)$/);
    if (found) {
      key = found[1].trim();
      fields[key] = found[2].trim();
    } else if (key && !line.startsWith("}}")) fields[key] += `\n${line}`;
  }
  return fields;
}

function plain(value = "") {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&times;/gi, "×")
    .replace(/'''?/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function numberFrom(value, fallback = 0) {
  const match = plain(value).replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function recipeFrom(fields) {
  const candidates = [fields["修正图鉴"], fields["润色图鉴"], fields["官方图鉴"]].filter(Boolean);
  for (const candidate of candidates) {
    const text = plain(candidate);
    const match = text.match(/融合配方[：:]\s*([^\n]+)/);
    if (match) return match[1].replace(/[（(].*?[）)]/g, "").trim();
  }
  return plain(fields["融合素材"] || "")
    .replace(/、?br、?/gi, "+")
    .replace(/[、，,]/g, "+")
    .replace(/\+{2,}/g, "+")
    .replace(/^\+|\+$/g, "")
    .trim();
}

const baseNameToId = {
  豌豆射手: "pea", 向日葵: "sun", 樱桃炸弹: "cherry", 坚果: "nut", 土豆雷: "potato",
  寒冰射手: "frost", 大嘴花: "chomper", 忧郁菇: "gloom", 小喷菇: "puff", 阳光菇: "sunshroom",
  大喷菇: "fume", 大蘑菇: "fume", 魅惑菇: "hypno", 寒冰菇: "iceShroom", 毁灭菇: "doom",
  睡莲: "lilypad", 荷叶: "lilypad", 火爆辣椒: "pepper", 地刺: "spikeweed", 火炬树桩: "torchwood",
  高坚果: "tallnut", 路灯花: "lantern", 仙人掌: "cactus", 三叶草: "blover", 五叶草: "blover",
  杨桃: "star", 南瓜: "pumpkin", 南瓜头: "pumpkin", 磁力菇: "magnet", 卷心菜投手: "cabbage",
  玉米投手: "corn", 大蒜: "garlic", 叶子保护伞: "umbrella", 西瓜投手: "melon", 胆小菇: "scaredy",
  三线射手: "threepeater", 窝瓜: "squash", 缠绕水草: "kelp", 猫尾草: "cattail", 地刺王: "spikerock",
  海蘑菇: "seaShroom", 花盆: "flowerpot", 金盏花: "marigold", 钢叶草: "steelLeaf", 云杉弓手: "spruce",
  云杉弩炮: "spruceBallista", 水滴芦荟: "aloe", 寒冰莲花: "iceLotus", 小松炉: "pineFurnace",
  冬笋路障: "winterBamboo", 雪棘草: "snowThorn",
};

const existingByName = new Map(Object.values(BaseFusions).map(def => [def.name, def]));
const ultimateIdByName = new Map(names.map((name, index) => [name, `ultimate${String(index + 1).padStart(3, "0")}`]));

function normalizedMaterialName(name) {
  return name
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d.、 ]+/, "")
    .replace(/（.*?）|\(.*?\)/g, "")
    .replace(/×\d+$/g, "")
    .replace(/的?卡牌$/g, "")
    .trim();
}

function tokenFor(name) {
  const normalized = normalizedMaterialName(name);
  if (baseNameToId[normalized]) return baseNameToId[normalized];
  if (existingByName.has(normalized)) return existingByName.get(normalized).id;
  if (ultimateIdByName.has(normalized)) return ultimateIdByName.get(normalized);
  const withoutPrefix = normalized.replace(/^(超级|究极)/, "");
  if (existingByName.has(withoutPrefix)) return existingByName.get(withoutPrefix).id;
  return "";
}

function materialNames(recipe) {
  return recipe
    .replace(/[＋]/g, "+")
    .split(/\s*\+\s*/)
    .flatMap(part => {
      const count = Number(part.match(/[×x*]\s*(\d+)/i)?.[1] || 1);
      const name = normalizedMaterialName(part);
      return Array.from({ length: Math.min(3, count) }, () => name);
    })
    .filter(Boolean);
}

function inferBase(name, materials) {
  for (const material of [...materials].reverse()) {
    const token = tokenFor(material);
    if (baseNameToId[material]) return baseNameToId[material];
    if (existingByName.has(material)) return existingByName.get(material).baseId;
    const prior = Object.values(ultimateDefs).find(def => def.id === token);
    if (prior) return prior.baseId;
  }
  if (/忧郁菇/.test(name)) return "gloom";
  if (/大喷菇/.test(name)) return "fume";
  if (/向日葵|阳光/.test(name)) return "sun";
  if (/坚果|南瓜|帝果|伞|花盆|路障/.test(name)) return "nut";
  if (/地刺/.test(name)) return "spikeweed";
  if (/大嘴花|战神/.test(name)) return "chomper";
  if (/杨桃/.test(name)) return "star";
  if (/磁力/.test(name)) return "magnet";
  if (/三叶|五叶/.test(name)) return "blover";
  if (/毁灭菇/.test(name)) return "doom";
  return "pea";
}

function inferBody(name, baseId, damage) {
  if (/坚果|南瓜|帝果|伞|花盆|路障|箱子/.test(name)) return "guard";
  if (/向日葵|摇钱|太阳能睡莲/.test(name)) return "producer";
  if (/魅帝菇|魅后菇|磁力菇王|磁力菇后|路灯花|三叶草|五叶草/.test(name)) return "support";
  if (/地刺|土豆雷/.test(name)) return "trap";
  if (/大嘴花|战神/.test(name)) return "melee";
  if (/核爆樱桃|核爆窝瓜|寒冰菇$|毁灭菇$/.test(name)) return "burst";
  return damage > 0 ? "shooter" : (baseId === "sun" ? "producer" : "support");
}

function traitsFor(name, description) {
  const text = `${name} ${description}`;
  const traits = [];
  if (/火|焱|烈焰|浴火|飞火|爆破|樱桃|核爆/.test(text)) traits.push("fire");
  if (/冰|寒|冷寂|寂灭|冻结|减速/.test(text)) traits.push("frost", "deepfreeze");
  if (/爆|樱桃|毁灭|核/.test(text)) traits.push("burst", "splash");
  if (/阳光|太阳|摇钱/.test(text)) traits.push("producer");
  if (/魅|贪欲|海妖/.test(text)) traits.push("weaken");
  if (/坚果|南瓜|帝果|伞|花盆|路障/.test(text)) traits.push("guard");
  if (/磁力/.test(text)) traits.push("magnet");
  if (/大嘴花|战神|吞/.test(text)) traits.push("devour");
  if (/地刺|荆棘/.test(text)) traits.push("spike");
  if (/杨桃|全方向|周围|范围/.test(text)) traits.push("radial");
  if (/大喷菇|激光|穿透|整行/.test(text)) traits.push("pierce");
  return [...new Set(traits)];
}

const ultimateDefs = {};
const missingPages = [];
for (const [index, requestedName] of names.entries()) {
  const source = wikiByName.get(requestedName) || "";
  if (!source) missingPages.push(requestedName);
  const fields = fieldsFrom(source);
  const name = plain(fields["名称"] || requestedName);
  const recipe = recipeFrom(fields);
  const materials = materialNames(recipe);
  const inputTokens = materials.map(tokenFor).filter(Boolean);
  const id = ultimateIdByName.get(requestedName);
  const baseId = inferBase(name, materials);
  const damageText = plain(fields["攻击力"] || "");
  const damage = numberFrom(damageText, /射手|菇|炮|投手|杨桃|仙人掌|猫尾草/.test(name) ? 100 : 0);
  const shotMatch = damageText.match(/[×x*]\s*(\d+)/i);
  const shotCount = shotMatch ? Math.max(1, Number(shotMatch[1])) : (/机枪/.test(name) ? 4 : /三线/.test(name) ? 3 : 1);
  const body = inferBody(name, baseId, damage);
  const hp = numberFrom(fields["韧性"], /坚果|南瓜|帝果|伞|花盆|路障/.test(name) ? 8000 : 300);
  const interval = numberFrom(fields["攻击间隔"], body === "producer" ? 12 : body === "support" ? 7 : body === "burst" ? 10 : 1.5);
  const description = (plain(fields["修正图鉴"] || fields["润色图鉴"] || fields["官方图鉴"]) || `融合配方：${recipe || "文档未提供"}`).slice(0, 1400);
  const traits = traitsFor(name, description);
  const splash = traits.includes("splash");
  const radial = traits.includes("radial") || /忧郁菇|杨桃|伞/.test(name);
  ultimateDefs[id] = {
    id, name, materials, recipe, inputTokens,
    materialIds: [],
    available: inputTokens.length === materials.length && materials.length === 2,
    baseId, body, hp, damage, interval,
    traits,
    color: traits.includes("frost") ? "#78dced" : traits.includes("fire") ? "#ef704f" : traits.includes("producer") ? "#f2cf55" : /魅|菇/.test(name) ? "#9b63d3" : "#79c766",
    production: traits.includes("producer") ? "究极阳光生产" : "",
    description,
    source: `https://wiki.biligame.com/pvzrh/${encodeURIComponent(requestedName)}`,
    abilities: {
      shotCount, backShots: 0, bounce: /弹弹/.test(name), pierce: traits.includes("pierce"), splash,
      knockback: /炮|窝瓜|战神|路障/.test(name), sunEvery: traits.includes("producer") && damage > 0 ? 3 : 0,
      sunValue: traits.includes("producer") ? 15 : 0, sunCycle: traits.includes("producer") ? Math.max(6, interval) : 0,
      sunProduction: traits.includes("producer") ? 50 : 0, freeze: traits.includes("frost"), fire: traits.includes("fire"),
      stun: /磁爆|激光|雷/.test(name), heal: /坚果|南瓜|帝果|伞/.test(name), devour: traits.includes("devour"), radial,
      ultimate: true,
    },
  };
}

const allDefs = { ...BaseFusions, ...ultimateDefs };
for (const def of Object.values(ultimateDefs)) {
  const ids = new Set();
  for (const token of def.inputTokens) {
    if (baseNameToId[Object.keys(baseNameToId).find(name => baseNameToId[name] === token)]) ids.add(token);
    const sourceDef = allDefs[token];
    for (const materialId of sourceDef?.materialIds || []) ids.add(materialId);
    if (!sourceDef && Object.values(baseNameToId).includes(token)) ids.add(token);
  }
  def.materialIds = [...ids];
}

const recipes = {};
for (const def of Object.values(ultimateDefs)) {
  if (!def.available) continue;
  const key = [...def.inputTokens].sort().join("|");
  if (!BaseRecipes[key] && !recipes[key]) recipes[key] = def.id;
  else if (BaseRecipes[key] !== def.id) def.available = false;
}

const output = `(function(root,factory){\n  const data=factory();\n  if(typeof module!=="undefined"&&module.exports)module.exports=data;\n  root.UltimateCatalog=data;\n})(typeof globalThis!=="undefined"?globalThis:this,function(){\n  const FUSIONS=${JSON.stringify(ultimateDefs)};\n  const RECIPES=${JSON.stringify(recipes)};\n  return {FUSIONS,RECIPES};\n});\n`;
fs.writeFileSync(new URL("../src/ultimate-catalog.js", import.meta.url), output);

const reachable = Object.values(ultimateDefs).filter(def => def.available).length;
console.log(JSON.stringify({ requested: names.length, fetched: wikiByName.size, missingPages, reachable, recipes: Object.keys(recipes).length }, null, 2));
