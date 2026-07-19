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

assert.equal(Object.keys(Core.PLANTS).length, 30, "the base roster should remain unchanged");
assert.equal(Object.keys(Catalog.FUSIONS).length, 200, "the new document contains 200 fusion plants");
assert.equal(Object.keys(Catalog.RECIPES).length, 85, "the document yields 85 executable drag steps");
assert.equal(Object.values(Catalog.FUSIONS).filter(plant => plant.available).length, 82, "82 plants are reachable from the current base roster");

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
assert.equal(Core.previewFusion(make("frost"), make("pea")).valid, false, "non-document pairs must be rejected");
assert.equal(Core.previewFusion(make("sun"), make("pea")).name, "豌豆向日葵");
assert.equal(Catalog.FUSIONS.fusion001.name, "巨型坚果");
assert.equal(Catalog.FUSIONS.fusion200.name, "星辉忧郁菇");

const ability = name => Object.values(Catalog.FUSIONS).find(plant => plant.name === name).abilities;
assert.equal(ability("双发射手").shotCount, 2);
assert.deepEqual([ability("裂荚射手").shotCount, ability("裂荚射手").backShots, ability("裂荚射手").bounce], [3, 2, true]);
assert.equal(ability("机枪射手").shotCount, 4);
assert.deepEqual([ability("豌豆向日葵").sunEvery, ability("豌豆向日葵").sunValue, ability("豌豆向日葵").sunCycle], [3, 5, 25]);
assert.equal(ability("坚果射手").pierce, true);
assert.equal(ability("超级樱桃射手").splash, true);

console.log("core tests passed: 200 documented plants, 85 drag steps, 82 reachable multi-stage fusions");
