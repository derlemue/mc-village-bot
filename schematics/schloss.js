module.exports = {
  name: 'Schloss',
  width: 30, height: 12, depth: 30,
  foundation: 'stone_bricks', foundationHeight: 2,
  walls: 'dark_oak_wood',
  roof: 'dark_oak_stairs',
  doorPos: { x: 15, z: 0 },
  details: [
    { x: 14, y: 2, z: 0, block: 'dark_oak_door' },
    { x: 15, y: 2, z: 0, block: 'dark_oak_door' },
    { x: 1, y: 4, z: 1, block: 'lantern' },
    { x: 28, y: 4, z: 28, block: 'lantern' },
    { x: 15, y: 6, z: 15, block: 'ender_chest' }
  ]
};
