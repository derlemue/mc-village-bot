module.exports = {
  name: 'Kneipe',
  width: 6, height: 7, depth: 6,
  foundation: 'stone_bricks', foundationHeight: 1,
  walls: 'spruce_wood',
  roof: 'spruce_stairs',
  doorPos: { x: 8, z: 0 },
  details: [
    { x: 7, y: 1, z: 0, block: 'spruce_door' },
    { x: 7, y: 2, z: 0, block: 'spruce_door' },
    { x: 1, y: 2, z: 1, block: 'lantern' },
    { x: 14, y: 2, z: 14, block: 'lantern' },
    { x: 8, y: 4, z: 8, block: 'brewing_stand' }
  ]
};
