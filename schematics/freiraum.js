const lanterns = [];

// Generate lanterns dynamically
// Grid from 5 to 95 (inclusive), step 10
// 5, 15, 25, ..., 95
for (let x = 5; x < 100; x += 10) {
  for (let z = 5; z < 100; z += 10) {
    lanterns.push({ x: x, y: 1, z: z, block: 'lantern' });
  }
}

module.exports = {
  name: 'Freiraum',
  width: 100,
  height: 1,
  depth: 100,
  foundation: 'stone_bricks',
  foundationHeight: 1,
  walls: 'air',
  roof: 'air',
  doorPos: { x: 50, z: 0 }, // Adjusted door position roughly to center/edge
  details: lanterns
};
