const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const houses = require('./houses.js');

const config = {
  host: 'localhost',
  port: 25565,
  username: 'BuilderBot',
  version: false
};

const bot = mineflayer.createBot(config);

bot.loadPlugin(pathfinder);
bot.once('spawn', () => {
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  defaultMove.canDig = false;
  defaultMove.allow1by1towers = false;
  bot.pathfinder.setMovements(defaultMove);
  
  bot.chat('BuilderBot bereit!');
});

let currentBuildData = null;
let buildQueue = [];
let currentBuildingIndex = 0;

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;
  
  const args = message.split(' ');
  if (args[0] === '!build') {
    const x = parseInt(args[1]);
    const z = parseInt(args[2]);
    const houseName = args.slice(3).join(' ');
    
    if (!x || !z || !houseName) {
      bot.chat('Verwendung: !build <x> <z> <houseName>');
      return;
    }
    
    const house = findHouse(houseName);
    if (!house) {
      bot.chat(`Haus "${houseName}" nicht gefunden.`);
      return;
    }
    
    buildQueue.push({ x, z, house });
    bot.chat(`"${houseName}" zur Warteschlange hinzugefügt an ${x}, ${z}`);
    
    if (buildQueue.length === 1) {
      await buildNext();
    }
  }
});

async function buildNext() {
  if (buildQueue.length === 0) return;
  
  const buildData = buildQueue[0];
  currentBuildData = buildData;
  
  // Teleport zur Baustelle (Y+20)
  await bot.chat(`/tp ${buildData.x} ${buildData.house.height + 20} ${buildData.z}`);
  await bot.waitForTicks(40); // 2 Sekunden warten
  
  // Zur Baustelle laufen (Y auf Bodenhöhe)
  const targetPos = { x: buildData.x + Math.floor(buildData.house.width / 2), y: buildData.house.height, z: buildData.z + Math.floor(buildData.house.depth / 2) };
  await bot.pathfinder.goto(new goals.GoalBlock(targetPos.x, targetPos.y, targetPos.z));
  
  await buildHouse(buildData);
  
  buildQueue.shift();
  currentBuildingIndex = 0;
  currentBuildData = null;
  
  if (buildQueue.length > 0) {
    await bot.waitForTicks(20);
    await buildNext();
  }
}

async function buildHouse(data) {
  const house = data.house;
  const materials = house.materials || getDefaultMaterials(house);
  
  bot.chat(`Starte Bau von "${house.name}" an ${data.x}, ${data.z}`);
  
  // Terrain vorbereiten
  await prepareTerrain(data.x, data.z, house);
  
  // Haus bauen
  for (let y = 0; y < house.height; y++) {
    if (house.pattern[y]) {
      const layer = house.pattern[y].blocks;
      for (let z = 0; z < house.depth; z++) {
        for (let x = 0; x < house.width; x++) {
          const blockChar = layer[z * house.width + x];
          if (blockChar !== '.') {
            const blockType = materials[blockChar];
            if (blockType) {
              const pos = {
                x: data.x + x,
                y: y,
                z: data.z + z
              };
              await placeBlock(pos, blockType);
            }
          }
        }
      }
    }
  }
  
  bot.chat(`"${house.name}" fertiggestellt!`);
}

async function prepareTerrain(startX, startZ, house) {
  // Gelände für Straßen und Füllmaterial vorbereiten
  const roadWidth = 2;
  const buildArea = {
    minX: startX - roadWidth,
    maxX: startX + house.width + roadWidth,
    minZ: startZ - roadWidth,
    maxZ: startZ + house.depth + roadWidth
  };
  
  // Straßenbereich mit stone_bricks füllen
  for (let x = buildArea.minX; x <= buildArea.maxX; x++) {
    for (let z = buildArea.minZ; z <= buildArea.maxZ; z++) {
      if (isRoadPosition(x - startX, z - startZ, house)) {
        const pos = { x, y: 0, z };
        await fillColumn(pos, 'stone_bricks');
      }
    }
  }
  
  // Füllmaterial mit deepslate_tiles
  for (let x = startX; x < startX + house.width; x++) {
    for (let z = startZ; z < startZ + house.depth; z++) {
      const pos = { x, y: 0, z };
      await fillColumn(pos, 'deepslate_tiles');
    }
  }
}

function isRoadPosition(localX, localZ, house) {
  // Einfache Straßenlogik: Randbereich
  return localX < 2 || localX >= house.width - 2 || 
         localZ < 2 || localZ >= house.depth - 2;
}

async function fillColumn(pos, blockType) {
  const maxHeight = 50;
  for (let y = 0; y < maxHeight; y++) {
    const targetPos = { ...pos, y };
    const block = bot.blockAt(targetPos);
    if (block.name !== 'air') {
      await bot.dig(block);
    }
    await placeBlock(targetPos, blockType);
  }
}

async function placeBlock(pos, blockType) {
  const block = bot.blockAt(pos);
  if (block.name !== 'air') {
    await bot.dig(block);
  }
  
  // Bot positioniert sich nahe der Baustelle
  await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, 2));
  
  const referenceBlock = bot.blockAt({ x: pos.x, y: pos.y - 1, z: pos.z });
  await bot.placeBlock(bot.registry.blocksByName[blockType].id, referenceBlock.position);
}

function findHouse(name) {
  for (let key in houses.villageHouses) {
    const house = houses.villageHouses[key];
    if (house.name.toLowerCase().includes(name.toLowerCase())) {
      return house;
    }
  }
  return null;
}

function getDefaultMaterials(house) {
  return {
    s: 'stone_bricks',  // Straßen geändert
    f: 'deepslate_tiles', // Füllmaterial geändert
    p: 'oak_planks',
    w: 'oak_log',
    '.': 'air',
    // Weitere Standardmaterialien...
  };
}

module.exports = bot;
