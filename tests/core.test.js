const assert = require("node:assert/strict");
const Catalog = require("../src/fusion-catalog.js");
const Core = require("../src/core.js");

let uid = 1;
const make = id => Core.createPlant(id, uid++, 0, 0);
const plantIds = Object.keys(Core.PLANTS);
assert.equal(plantIds.length, 30, "the unchanged base roster should contain 30 plants");
assert.equal(Object.keys(Catalog.FUSIONS).length, 65, "the supplied document contains 65 fusion plants");
assert.equal(Object.keys(Catalog.RECIPES).length, 38, "38 document recipes are craftable from the unchanged base roster");
assert.deepEqual(Object.values(Core.PLANTS).map(plant => plant.name), [
  "豌豆射手", "向日葵", "樱桃炸弹", "坚果墙", "土豆地雷", "寒冰射手", "大嘴花", "忧郁菇", "小喷菇", "阳光菇",
  "大蘑菇", "魅惑菇", "寒冰菇", "毁灭菇", "荷叶", "火爆辣椒", "地刺", "火炬树桩", "高坚果", "路灯花",
  "仙人掌", "三叶草", "杨桃", "南瓜", "磁力菇", "卷心菜投手", "玉米投手", "大蒜", "叶子保护伞", "西瓜投手"
]);

for (const [pair, fusionId] of Object.entries(Catalog.RECIPES)) {
  const [a, b] = pair.split("|");
  const expected = Catalog.FUSIONS[fusionId];
  const hostAB = make(b), hostBA = make(a);
  const previewAB = Core.previewFusion(make(a), hostAB);
  const previewBA = Core.previewFusion(make(b), hostBA);
  assert.equal(previewAB.valid, true, `${pair} should be supported`);
  assert.equal(previewBA.valid, true, `${pair} should ignore placement order`);
  assert.equal(previewAB.name, expected.name);
  assert.equal(previewBA.name, expected.name);
  assert.equal(Core.fuse(make(a), hostAB).ok, true);
  assert.equal(Core.fuse(make(b), hostBA).ok, true);
  assert.equal(hostAB.fusionId, fusionId);
  assert.equal(hostBA.fusionId, fusionId);
  assert.equal(hostAB.displayName, expected.name);
  assert.equal(hostAB.maxHp, expected.hp);
  assert.equal(Core.damageFor(hostAB), expected.damage);
  assert.deepEqual(hostAB.materialIds, hostBA.materialIds);
  assert.equal(Core.previewFusion(make(a), hostAB).valid, false, "a fusion result cannot be fused again");
}

assert.equal(Core.previewFusion(make("pea"), make("pea")).valid, false, "same plants are not a document recipe");
assert.equal(Core.previewFusion(make("frost"), make("pea")).valid, false, "non-document pairs must be rejected");
assert.equal(Core.previewFusion(make("sun"), make("pea")).name, "豌豆向日葵");
assert.equal(Catalog.FUSIONS.fusion65.name, "芦荟医师");

console.log("core tests passed: 65 documented plants, 38 available whitelist recipes, order-independent fusion");
