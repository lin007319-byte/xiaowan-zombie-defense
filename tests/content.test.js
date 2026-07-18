const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.join(__dirname, "../src/game.js"), "utf8");
const zombieIds = ["basic", "cone", "bucket", "runner", "paper", "shield", "healer", "football", "balloon", "miner", "dancer", "giant", "imp", "ice"];

assert.match(game, /const BASE_WAVE_SECONDS = 30;/);
assert.match(game, /const SPAWN_GAPS = \[7\.2,6\.8,6\.4,6,5\.6,5\.2,4\.8,4\.4,4,3\.6\];/);
assert.match(game, /state\.zombies\.length<62/);
assert.match(game, /mowers: \[2,2,2,2,2\]/);
assert.match(game, /state\.mowers\[z\.row\]--/);
assert.match(game, /function poolForWave\(wave\)/);
assert.doesNotMatch(game, /battleTime>=state\.duration/);
for (const id of zombieIds) assert.match(game, new RegExp(`${id}:\\{hp:`), `missing zombie definition: ${id}`);
assert.match(game, /const ZOMBIE_POOLS=\[/);
assert.match(game, /CARDS_PER_ROW = 8/);

console.log(`content tests passed: endless waves + ${zombieIds.length} zombie types + dual-row card deck`);
