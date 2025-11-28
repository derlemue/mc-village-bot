module.exports = {
  villageHouses: [
    {
      name: 'Farmer House',
      profession: 'farmer',
      width: 9,
      depth: 7,
      height: 5,
      jobBlock: 'composter',
      pattern: [
        { y: 0, blocks: [
          'ppppppppp',
          'ppppppppp',
          'ppppppppp',
          'ppppppppp',
          'ppppppppp',
          'ppppppppp',
          'ppppppppp'
        ]},
        { y: 1, blocks: [
          'lwwwwwwwl',
          'w.......w',
          'w.......w',
          'd.......w',
          'w.......w',
          'w.......w',
          'lwwwwwwwl'
        ]},
        { y: 2, blocks: [
          'lwwwgwwwl',
          'w.......w',
          'w...c...w',
          '........w', // FIX: Luft (.) über Tür, war vorher anderes Zeichen
          'w...b...w',
          'w.......w',
          'lwwwwwwwl'
        ]},
        { y: 3, blocks: [
          'lwwwgwwwl',
          'w.......w',
          'w.......w',
          'w.......w',
          'w.......w',
          'w.......w',
          'lwwwwwwwl'
        ]},
        { y: 4, blocks: [
          'sssssssss',
          'sssssssss',
          'sssssssss',
          'sssssssss',
          'sssssssss',
          'sssssssss',
          'sssssssss'
        ]},
        { y: 5, blocks: [
          '...sss...',
          '...sss...',
          '...sss...',
          '...sss...',
          '...sss...',
          '...sss...',
          '...sss...'
        ]}
      ],
      materials: {
        'p': 'oak_planks',
        'w': 'oak_log',
        'l': 'stripped_oak_log',
        'd': 'oak_door',
        'g': 'glass_pane',
        'c': 'composter',
        'b': 'white_bed',
        's': 'oak_stairs',
        '.': 'air'
      }
    },

// derlemue

  {
    name: "Lighthouse Old",
    profession: "general",
    width: 9,
    depth: 9,
    pattern: [
      // Fundament (volle Außenlinie)
      {
        y: 0,
        blocks: [
          "rrrrrrrrr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rrrrrrrrr",
        ],
      },
      {
        y: 1,
        blocks: [
          "rrrrrrrrr",
          "r.......r",
          "r.......r",
          "r.......r",
          "d.......r",
          "r.......r",
          "r.......r",
          "r.......r",
          "rrrrrrrrr",
        ],
      },
      {
        y: 2,
        blocks: [
          "rrrrrrrrr",
          "r.......r",
          "r.......r",
          "r.......r",
          "........r",
          "r.......r",
          "r.......r",
          "r.......r",
          "rrrrrrrrr",
        ],  
      },   
      // 25 Ebenen Turm mit abwechselnden rot/weiß Streifen, Außenlinie, innen Luft
      ...Array.from({ length: 25 }, (_, i) => {
        const colorChar = i % 2 === 0 ? "r" : "w"; // r = rot, w = weiß
        return {
          y: i + 3,
          blocks: [
            colorChar.repeat(9),
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "... ..."+ colorChar, // 3x3 Luft innen (hier ... räumt 3 Luftblöcke frei)
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar.repeat(9),
          ],
        };
      }),
      // Plattformboden (EBene 26), luftfreier Bereich innen mit Umrandung
      {
        y: 27,
        blocks: [
          ".........",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".........",
        ]
      },
      // Geländer (Ebene 27)
      {
        y: 28,
        blocks: [
          ".........",
          ".ggggggg.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".ggggggg.",
          ".........",
        ],
      },
      // Lampenring oben (Ebene 28)
      {
        y: 29,
        blocks: [
          ".........",
          ".lllllll.",
          ".l.....l.",
          ".l.....l.",
          ".l..L..l.",
          ".l.....l.",
          ".l.....l.",
          ".lllllll.",
          ".........",
        ],
      },
    ],
    materials: {
      'r': "red_concrete",
      'w': "white_concrete",
      'd': 'oak_door',
      'B': "stone_bricks",
      'g': "stone_brick_wall",
      'l': "torch",
      'L': "sea_lantern",
      ".": "air",
      " ": "air",
    },
  },

  {
    name: "Lighthouse Old 2",
    profession: "general",
    width: 9,
    depth: 9,
    pattern: [
      // Fundament (volle Außenlinie)
      {
        y: 0,
        blocks: [
          "rrrrrrrrr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rBBBBBBBr",
          "rrrrrrrrr",
        ],
      },
      {
        y: 1,
        blocks: [
          "rrrrrrrrr",
          "r.......r",
          "r.......r",
          "r.......r",
          "d.......r",
          "r.......r",
          "r.......r",
          "r.......r",
          "rrrrrrrrr",
        ],
      },
      {
        y: 2,
        blocks: [
          "rrrrrrrrr",
          "r.......r",
          "r.......r",
          "r.......r",
          "........r",
          "r.......r",
          "r.......r",
          "r.......r",
          "rrrrrrrrr",
        ],  
      },   
      // 25 Ebenen Turm mit abwechselnden rot/weiß Streifen, Außenlinie, innen Luft
      ...Array.from({ length: 25 }, (_, i) => {
        const colorChar = i % 2 === 0 ? "r" : "w"; // r = rot, w = weiß
        return {
          y: i + 3,
          blocks: [
            colorChar.repeat(9),
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "... ..."+ colorChar, // 3x3 Luft innen (hier ... räumt 3 Luftblöcke frei)
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar + "......."+ colorChar,
            colorChar.repeat(9),
          ],
        };
      }),
      // Plattformboden (EBene 26), luftfreier Bereich innen mit Umrandung
      {
        y: 27,
        blocks: [
          ".........",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".BBBBBBB.",
          ".........",
        ]
      },
      // Geländer (Ebene 27)
      {
        y: 28,
        blocks: [
          ".........",
          ".ggggggg.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".g.....g.",
          ".ggggggg.",
          ".........",
        ],
      },
      // Lampenring oben (Ebene 28)
      {
        y: 29,
        blocks: [
          ".........",
          ".lllllll.",
          ".l.....l.",
          ".l.....l.",
          ".l..L..l.",
          ".l.....l.",
          ".l.....l.",
          ".lllllll.",
          ".........",
        ],
      },
    ],
    materials: {
      'r': "red_concrete",
      'w': "white_concrete",
      'd': 'oak_door',
      'B': "stone_bricks",
      'g': "stone_brick_wall",
      'l': "torch",
      'L': "sea_lantern",
      ".": "air",
      " ": "air",
    },
  },

// Sunshi

{
      name: 'Lighttower',
      profession: 'general',
      width: 5,
      depth: 5,
      height: 12,
      pattern: [
        { y: 0, blocks: [
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp'
        ]},
        { y: 1, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'd...w',
          'wwwww'
        ]},
        { y: 2, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          '....w',
          'wwwww'
        ]},
        { y: 3, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
        { y: 4, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
    { y: 5, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 6, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 7, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 8, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 9, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
{ y: 10, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
{ y: 11, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
      ],
      materials: {
        'p': 'spruce_planks',
        'w': 'spruce_log',
        'd': 'spruce_door',
        'g': 'glass_pane',
        'b': 'white_bed',
        's': 'spruce_stairs',
        '.': 'air'
      }
    },

{
      name: 'Lighttower 2',
      profession: 'general',
      width: 5,
      depth: 5,
      height: 12,
      pattern: [
        { y: 0, blocks: [
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp'
        ]},
        { y: 1, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'd...w',
          'wwwww'
        ]},
        { y: 2, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          '....w',
          'wwwww'
        ]},
        { y: 3, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
        { y: 4, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
    { y: 5, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 6, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 7, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 8, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
{ y: 9, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
{ y: 10, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
{ y: 11, blocks: [
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg',
          'ggggg'
        ]},
      ],
      materials: {
        'p': 'spruce_planks',
        'w': 'spruce_log',
        'd': 'spruce_door',
        'g': 'glass_pane',
        'b': 'white_bed',
        's': 'spruce_stairs',
        '.': 'air'
      }
    },

//


    {
      name: 'Weaponsmith House',
      profession: 'weaponsmith',
      width: 7,
      depth: 7,
      height: 6,
      jobBlock: 'grindstone',
      pattern: [
        { y: 0, blocks: [
          'ccccccc',
          'ccccccc',
          'ccccccc',
          'ccccccc',
          'ccccccc',
          'ccccccc',
          'ccccccc'
        ]},
        { y: 1, blocks: [
          'sssssss',
          's.....s',
          's.....s',
          'd.....s',
          's.....s',
          's.....s',
          'sssssss'
        ]},
        { y: 2, blocks: [
          'ssggsss',
          's.....s',
          's..g..s',
          '......s', // FIX: Luft (.) an Stelle der Tür über d
          's..b..s',
          's.....s',
          'sssssss'
        ]},
        { y: 3, blocks: [
          'ssggsss',
          's.....s',
          's.....s',
          's.....s',
          's.....s',
          's.....s',
          'sssssss'
        ]},
        { y: 4, blocks: [
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr'
        ]},
        { y: 5, blocks: [
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..'
        ]}
      ],
      materials: {
        'c': 'cobblestone',
        's': 'stone_bricks',
        'd': 'iron_door',
        'g': 'grindstone',
        'b': 'red_bed',
        'r': 'stone_brick_stairs',
        '.': 'air'
      },
      specialBlocks: [
        { x: 1, y: 0, z: 1, block: 'lava', type: 'forge' }
      ]
    },

    {
      name: 'Librarian House',
      profession: 'librarian',
      width: 6,
      depth: 8,
      height: 7,
      jobBlock: 'lectern',
      pattern: [
        { y: 0, blocks: [
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp'
        ]},
        { y: 1, blocks: [
          'wwwwww',
          'w....w',
          'w....w',
          'd....w',
          'w....w',
          'w....w',
          'w....w',
          'wwwwww'
        ]},
        { y: 2, blocks: [
          'wwggww',
          'w....w',
          'wkkkkw',
          '.....w', // FIX: Luft über Tür (.) an Stelle der Tür
          'wkkkkw',
          'w.l..w',
          'w.b..w',
          'wwwwww'
        ]},
        { y: 3, blocks: [
          'wwggww',
          'w....w',
          'wkkkkw',
          'w....w',
          'wkkkkw',
          'w....w',
          'w....w',
          'wwwwww'
        ]},
        { y: 4, blocks: [
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss'
        ]},
        { y: 5, blocks: [
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss'
        ]},
        { y: 6, blocks: [
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.'
        ]}
      ],
      materials: {
        'p': 'oak_planks',
        'w': 'spruce_log',
        'd': 'spruce_door',
        'g': 'glass_pane',
        'k': 'bookshelf',
        'l': 'lectern',
        'b': 'blue_bed',
        's': 'spruce_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Butcher Shop',
      profession: 'butcher',
      width: 7,
      depth: 6,
      height: 6,
      jobBlock: 'smoker',
      pattern: [
        { y: 0, blocks: [
          'ppppppp',
          'ppppppp',
          'ppppppp',
          'ppppppp',
          'ppppppp',
          'ppppppp'
        ]},
        { y: 1, blocks: [
          'wwwwwww',
          'w.....w',
          'w.....w',
          'd.....w',
          'w.....w',
          'wwwwwww'
        ]},
        { y: 2, blocks: [
          'wwgwgww',
          'w.....w',
          'w.s...w',
          '......w', // FIX: Luft (.) über Tür
          'w..b..w',
          'wwwwwww'
        ]},
        { y: 3, blocks: [
          'wwgwgww',
          'w.....w',
          'w.....w',
          'w.....w',
          'w.....w',
          'wwwwwww'
        ]},
        { y: 4, blocks: [
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr',
          'rrrrrrr'
        ]},
        { y: 5, blocks: [
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..',
          '..rrr..'
        ]}
      ],
      materials: {
        'p': 'oak_planks',
        'w': 'oak_log',
        'd': 'oak_door',
        'g': 'glass_pane',
        's': 'smoker',
        'b': 'white_bed',
        'r': 'oak_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Armorer House',
      profession: 'armorer',
      width: 6,
      depth: 6,
      height: 6,
      jobBlock: 'blast_furnace',
      pattern: [
        { y: 0, blocks: [
          'cccccc',
          'cccccc',
          'cccccc',
          'cccccc',
          'cccccc',
          'cccccc'
        ]},
        { y: 1, blocks: [
          'ssssss',
          's....s',
          's....s',
          'd....s',
          's....s',
          'ssssss'
        ]},
        { y: 2, blocks: [
          'ssggss',
          's....s',
          's.f..s',
          '.....s', // FIX: Luft über Tür
          's.b..s',
          'ssssss'
        ]},
        { y: 3, blocks: [
          'ssggss',
          's....s',
          's....s',
          's....s',
          's....s',
          'ssssss'
        ]},
        { y: 4, blocks: [
          'rrrrrr',
          'rrrrrr',
          'rrrrrr',
          'rrrrrr',
          'rrrrrr',
          'rrrrrr'
        ]},
        { y: 5, blocks: [
          '.rrrr.',
          '.rrrr.',
          '.rrrr.',
          '.rrrr.',
          '.rrrr.',
          '.rrrr.'
        ]}
      ],
      materials: {
        'c': 'cobblestone',
        's': 'stone_bricks',
        'd': 'iron_door',
        'g': 'glass_pane',
        'f': 'blast_furnace',
        'b': 'red_bed',
        'r': 'stone_brick_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Fletcher House',
      profession: 'fletcher',
      width: 7,
      depth: 5,
      height: 6,
      jobBlock: 'fletching_table',
      pattern: [
        { y: 0, blocks: [
          'ppppppp',
          'ppppppp',
          'ppppppp',
          'ppppppp',
          'ppppppp'
        ]},
        { y: 1, blocks: [
          'wwwwwww',
          'w.....w',
          'd.....w',
          'w.....w',
          'wwwwwww'
        ]},
        { y: 2, blocks: [
          'wwwgwww',
          'w.....w',
          '...t..w',
          'wb....w', // FIX: Luft (.) über Tür
          'wwwwwww'
        ]},
        { y: 3, blocks: [
          'wwwgwww',
          'w.....w',
          'w.....w',
          'w.....w',
          'wwwwwww'
        ]},
        { y: 4, blocks: [
          'sssssss',
          'sssssss',
          'sssssss',
          'sssssss',
          'sssssss'
        ]},
        { y: 5, blocks: [
          '..sss..',
          '..sss..',
          '..sss..',
          '..sss..',
          '..sss..'
        ]}
      ],
      materials: {
        'p': 'birch_planks',
        'w': 'birch_log',
        'd': 'birch_door',
        'g': 'glass_pane',
        't': 'fletching_table',
        'b': 'white_bed',
        's': 'birch_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Cartographer House',
      profession: 'cartographer',
      width: 6,
      depth: 6,
      height: 6,
      jobBlock: 'cartography_table',
      pattern: [
        { y: 0, blocks: [
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp',
          'pppppp'
        ]},
        { y: 1, blocks: [
          'wwwwww',
          'w....w',
          'w....w',
          'd....w',
          'w....w',
          'wwwwww'
        ]},
        { y: 2, blocks: [
          'wwggww',
          'w....w',
          'w.c..w',
          '.....w', // FIX: Luft über Tür
          'wwwwww'
        ]},
        { y: 3, blocks: [
          'wwggww',
          'w....w',
          'w....w',
          'w....w',
          'wwwwww'
        ]},
        { y: 4, blocks: [
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss',
          'ssssss'
        ]},
        { y: 5, blocks: [
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.',
          '.ssss.'
        ]}
      ],
      materials: {
        'p': 'oak_planks',
        'w': 'oak_log',
        'd': 'oak_door',
        'g': 'glass_pane',
        'c': 'cartography_table',
        'b': 'brown_bed',
        's': 'oak_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Simple House 1',
      profession: 'general',
      width: 5,
      depth: 5,
      height: 5,
      pattern: [
        { y: 0, blocks: [
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp'
        ]},
        { y: 1, blocks: [
          'wwwww',
          'w...w',
          'd...w',
          'w...w',
          'wwwww'
        ]},
        { y: 2, blocks: [
          'wwgww',
          'w...w',
          '....w',
          'wb..w', // FIX: Luft über Tür
          'wwwww'
        ]},
        { y: 3, blocks: [
          'wwgww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
        { y: 4, blocks: [
          'sssss',
          'sssss',
          'sssss',
          'sssss',
          'sssss'
        ]}
      ],
      materials: {
        'p': 'oak_planks',
        'w': 'cobblestone',
        'd': 'oak_door',
        'g': 'glass_pane',
        'b': 'white_bed',
        's': 'oak_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Simple House 2',
      profession: 'general',
      width: 5,
      depth: 6,
      height: 5,
      pattern: [
        { y: 0, blocks: [
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp',
          'ppppp'
        ]},
        { y: 1, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'd...w',
          'w...w',
          'wwwww'
        ]},
        { y: 2, blocks: [
          'wwwww',
          'wg..w',
          'w...w',
          '..b.w', // FIX: Luft über Tür
          'wwwww'
        ]},
        { y: 3, blocks: [
          'wwwww',
          'w...w',
          'w...w',
          'w...w',
          'wwwww'
        ]},
        { y: 4, blocks: [
          'sssss',
          'sssss',
          'sssss',
          'sssss',
          'sssss'
        ]}
      ],
      materials: {
        'p': 'spruce_planks',
        'w': 'spruce_log',
        'd': 'spruce_door',
        'g': 'glass_pane',
        'b': 'white_bed',
        's': 'spruce_stairs',
        '.': 'air'
      }
    },

    {
      name: 'Town Well',
      profession: 'decoration',
      width: 5,
      depth: 5,
      height: 4,
      pattern: [
        { y: 0, blocks: [
          'ccccc',
          'ccccc',
          'ccccc',
          'ccccc',
          'ccccc'
        ]},
        { y: 1, blocks: [
          'ccccc',
          'c...c',
          'c.w.c',
          'c...c',
          'ccccc'
        ]},
        { y: 2, blocks: [
          'l...l',
          '.....',
          '..w..',
          '.....',
          'l...l'
        ]},
        { y: 3, blocks: [
          'l...l',
          '..f..',
          '.....',
          '.....',
          'l...l'
        ]}
      ],
      materials: {
        'c': 'cobblestone',
        'w': 'water',
        'l': 'oak_log',
        'f': 'oak_fence',
        '.': 'air'
      }
    }
  ],

  villageLayout: {
    minHouses: 10,
    maxHouses: 20,
    spacing: 8,
    pathWidth: 3,
    centerWell: true,
    randomRotation: true
  }
};
