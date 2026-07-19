const assert = require("node:assert/strict");
const Catalog = require("../src/fusion-catalog.js");
const Core = require("../src/core.js");

let uid = 1;
const make = id => Core.createPlant(id, uid++, 0, 0);
const makeToken = token => {
  if (Core.PLANTS[token]) return make(token);
  const def = Catalog.FUSIONS[token];
  assert.ok(def, `unknown fusion token ${token}`);
  const plant = make(def.baseId);
  plant.fusionId = def.id;
  plant.displayName = def.name;
  plant.maxHp = def.hp;
  plant.hp = def.hp;
  plant.genes = [...def.traits];
  plant.materialIds = [...def.materialIds];
  return plant;
};

assert.equal(Object.keys(Core.PLANTS).length, 48, "the expanded base roster should contain 48 plants");
assert.equal(Object.keys(Catalog.FUSIONS).length, 301, "the documents contain 200 fusion plants and 101 ultimate plants");
assert.equal(Object.keys(Catalog.RECIPES).length, 206, "documented and equivalent materials should yield 206 executable drag steps");
assert.equal(Object.values(Catalog.FUSIONS).filter(plant => plant.available).length, 180, "180 plants are reachable from the expanded roster");
const ultimatePlants = Object.values(Catalog.FUSIONS).filter(plant => plant.abilities?.ultimate);
assert.equal(ultimatePlants.length, 101, "the PDF should contribute all 101 ultimate plants");
assert.equal(ultimatePlants.filter(plant => plant.available).length, 38, "38 ultimate plants have complete executable recipes");
assert.ok(ultimatePlants.every(plant => plant.source?.startsWith("https://wiki.biligame.com/pvzrh/")), "every ultimate card should preserve its Wiki source");
assert.ok(ultimatePlants.every(plant => plant.description), "every ultimate card should include an almanac description");
assert.equal(Core.PLANTS.fume.interval, 1.45, "大喷菇应每 1.45 秒喷射一次毒气");
assert.equal(Core.PLANTS.fume.damage, 24, "大喷菇每次毒气伤害应为 24");
assert.equal(Core.PLANTS.gloom.damage, 28, "忧郁菇每一喷伤害应为 28");

for (const [pair, fusionId] of Object.entries(Catalog.RECIPES)) {
  const [a, b] = pair.split("|");
  const expected = Catalog.FUSIONS[fusionId];
  const hostAB = makeToken(b), hostBA = makeToken(a);
  const previewAB = Core.previewFusion(makeToken(a), hostAB);
  const previewBA = Core.previewFusion(makeToken(b), hostBA);
  assert.equal(previewAB.valid, true, `${pair} should be supported`);
  assert.equal(previewBA.valid, true, `${pair} should ignore placement order`);
  assert.equal(previewAB.name, expected.name);
  assert.equal(previewBA.name, expected.name);
  assert.equal(Core.fuse(makeToken(a), hostAB).ok, true);
  assert.equal(Core.fuse(makeToken(b), hostBA).ok, true);
  assert.equal(hostAB.fusionId, fusionId);
  assert.equal(hostBA.fusionId, fusionId);
  assert.equal(hostAB.displayName, expected.name);
  assert.equal(hostAB.maxHp, expected.hp);
  assert.equal(Core.damageFor(hostAB), expected.damage);
}

assert.equal(Core.previewFusion(make("pea"), make("pea")).name, "双发射手");
const doublePea = make("pea");
assert.equal(Core.fuse(make("pea"), doublePea).ok, true);
assert.equal(doublePea.displayName, "双发射手");
assert.equal(Core.fuse(make("pea"), doublePea).ok, true);
assert.equal(doublePea.displayName, "裂荚射手");
assert.equal(Core.fuse(make("pea"), doublePea).ok, true);
assert.equal(doublePea.displayName, "机枪射手");
const cherryMachine = makeToken(Object.values(Catalog.FUSIONS).find(plant => plant.name === "机枪射手").id);
assert.equal(Core.previewFusion(make("cherry"), cherryMachine).name, "樱桃机枪射手", "豌豆射手×4 must be recognized as 机枪射手");
assert.equal(Core.fuse(make("cherry"), cherryMachine).ok, true);
assert.equal(cherryMachine.displayName, "樱桃机枪射手");
assert.equal(Core.previewFusion(make("frost"), make("pea")).valid, false, "non-document pairs must be rejected");
assert.equal(Core.previewFusion(make("sun"), make("pea")).name, "豌豆向日葵");
assert.equal(Catalog.FUSIONS.fusion001.name, "巨型坚果");
assert.equal(Catalog.FUSIONS.fusion200.name, "星辉忧郁菇");
assert.equal(Catalog.FUSIONS.ultimate001.name, "魅帝菇");
assert.equal(Catalog.FUSIONS.ultimate002.name, "究极樱桃射手");
assert.equal(Catalog.FUSIONS.ultimate101.name, "末影南瓜箱子");
assert.equal(Catalog.FUSIONS.ultimate002.abilities.shotCount, 4);
assert.equal(Catalog.FUSIONS.ultimate002.damage, 300);

const ability = name => Object.values(Catalog.FUSIONS).find(plant => plant.name === name).abilities;
assert.equal(ability("双发射手").shotCount, 2);
assert.deepEqual([ability("裂荚射手").shotCount, ability("裂荚射手").backShots, ability("裂荚射手").bounce], [3, 2, true]);
assert.equal(ability("机枪射手").shotCount, 4);
assert.deepEqual([ability("豌豆向日葵").sunEvery, ability("豌豆向日葵").sunValue, ability("豌豆向日葵").sunCycle], [3, 5, 25]);
assert.equal(ability("坚果射手").pierce, true);
assert.equal(ability("超级樱桃射手").splash, true);

console.log("core tests passed: 48 bases, 301 documented fusion/ultimate plants, 206 semantic drag steps, 180 reachable fusions");
