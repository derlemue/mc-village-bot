module.exports = {
  name: 'Kneipe',
  width: 6, height: 7, depth: 6,
  foundation: 'stone_bricks', foundationHeight: 1,
  walls: 'spruce_wood',
  roof: 'spruce_stairs',
  doorPos: { x: 4, z: 0 },
  details: [
    { x: 4, y: 1, z: 0, block: 'spruce_door' },
    { x: 4, y: 2, z: 0, block: 'spruce_door' },
    { x: 1, y: 2, z: 1, block: 'lantern' },
    { x: 3, y: 6, z: 3, block: 'lantern' },
    { x: 3, y: 1, z: 3, block: 'brewing_stand' }
  ]
};
