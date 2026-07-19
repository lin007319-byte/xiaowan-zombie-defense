const assert = require("node:assert/strict");
const Core = require("../src/core.js");

let uid = 1;
const make = id => Core.createPlant(id, uid++, 0, 0);
const plantIds = Object.keys(Core.PLANTS);
assert.equal(plantIds.length, 30, "v2.9 should expose the requested 30 plant types");
assert.deepEqual(Object.values(Core.PLANTS).map(plant => plant.name), [
  "豌豆射手", "向日葵", "樱桃炸弹", "坚果墙", "土豆地雷", "寒冰射手", "大嘴花", "忧郁菇", "小喷菇", "阳光菇",
  "大蘑菇", "魅惑菇", "寒冰菇", "毁灭菇", "荷叶", "火爆辣椒", "地刺", "火炬树桩", "高坚果", "路灯花",
  "仙人掌", "三叶草", "杨桃", "南瓜", "磁力菇", "卷心菜投手", "玉米投手", "大蒜", "叶子保护伞", "西瓜投手"
]);

for (const donorId of plantIds) {
  for (const hostId of plantIds) {
    const donor = make(donorId), host = make(hostId);
    const preview = Core.previewFusion(donor, host);
    assert.equal(preview.valid, true, `${donorId}>${hostId} should be valid`);
    const result = Core.fuse(donor, host);
    assert.equal(result.ok, true);
    if (donorId === hostId) assert.equal(host.rank, 2);
  }
}

for (let a = 0; a < plantIds.length; a++) {
  for (let b = a + 1; b < plantIds.length; b++) {
    const firstA = make(plantIds[a]), firstB = make(plantIds[b]);
    const secondA = make(plantIds[a]), secondB = make(plantIds[b]);
    Core.fuse(firstA, firstB);
    Core.fuse(secondB, secondA);
    assert.equal(firstB.baseId, secondA.baseId, `${plantIds[a]}+${plantIds[b]} base should ignore order`);
    assert.equal(firstB.displayName, secondA.displayName, `${plantIds[a]}+${plantIds[b]} name should ignore order`);
    assert.deepEqual([...firstB.genes].sort(), [...secondA.genes].sort(), `${plantIds[a]}+${plantIds[b]} genes should ignore order`);
    assert.deepEqual([...firstB.materialIds].sort(), [...secondA.materialIds].sort(), `${plantIds[a]}+${plantIds[b]} visual traits should ignore order`);
    assert.equal(firstB.maxHp, secondA.maxHp, `${plantIds[a]}+${plantIds[b]} hp should ignore order`);
    assert.equal(Core.damageFor(firstB), Core.damageFor(secondA), `${plantIds[a]}+${plantIds[b]} damage should ignore order`);
  }
}

const pea1 = make("pea"), pea2 = make("pea");
Core.fuse(pea1, pea2);
assert.equal(pea2.rank, 2);
const pea3 = make("pea");
Core.fuse(pea3, pea2);
assert.equal(pea2.rank, 3);
assert.equal(Core.previewFusion(make("pea"), pea2).valid, false);

const host = make("pea");
Core.fuse(make("sun"), host);
assert.equal(host.displayName, "阳光豌豆");
assert.deepEqual(host.genes, ["producer"]);
assert.ok(host.maxHp >= host.hp);

const peaNutA = make("pea"), peaNutB = make("nut");
Core.fuse(peaNutA, peaNutB);
const nutPeaA = make("nut"), nutPeaB = make("pea");
Core.fuse(nutPeaA, nutPeaB);
assert.equal(peaNutB.displayName, "坚果炮台");
assert.equal(nutPeaB.displayName, "坚果炮台");
assert.equal(peaNutB.baseId, nutPeaB.baseId);
assert.deepEqual(peaNutB.genes, nutPeaB.genes);
assert.deepEqual(peaNutB.materialIds, nutPeaB.materialIds);

console.log(`core tests passed: ${plantIds.length * (plantIds.length + 1) / 2} order-independent combinations + rank checks`);
