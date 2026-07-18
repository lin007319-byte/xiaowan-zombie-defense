const assert = require("node:assert/strict");
const Core = require("../src/core.js");

let uid = 1;
const make = id => Core.createPlant(id, uid++, 0, 0);
const plantIds = Object.keys(Core.PLANTS);
assert.equal(plantIds.length, 15, "v2.0 should expose 15 plant types");

for (const donorId of plantIds) {
  for (const hostId of plantIds) {
    const donor = make(donorId), host = make(hostId);
    const preview = Core.previewFusion(donor, host);
    assert.equal(preview.valid, true, `${donorId}>${hostId} should be valid`);
    const result = Core.fuse(donor, host);
    assert.equal(result.ok, true);
    if (donorId === hostId) assert.equal(host.rank, 2);
    else assert.ok(host.genes.includes(Core.PLANTS[donorId].gene));
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

console.log(`core tests passed: ${plantIds.length ** 2} directional combinations + rank and authored recipe checks`);
