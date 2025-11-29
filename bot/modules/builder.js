const Vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

// ===== IMPORTS =====
const housesConfig = require('../config/houses');
const utils = require('./utils');
const { saveState } = require('./persistence');
const https = require('https');
const movement = require('./movement');
const terrain = require('./terrain');

// CONSTANTS
const ROAD_BLOCK = 'stone_bricks';
const FILL_BLOCK = 'deepslate_tiles';
const AREA_PADDING = 10; // ✅ 10 Blöcke Rand um jedes Gebäude
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DATA_DIR = './data';
const BUILDINGS_DB_FILE = './data/buildings.json';
const VILLAGES_DB_FILE = './data/villages.json';

// ===== HYBRIDES LADEN: houses.js + schematics/ =====
function loadAllHouses() {
  console.log('📦 Lade Gebäude von houses.js + schematics/...');
  
  const allHouses = [];
  
  // 1. houses.js laden
  if (housesConfig && housesConfig.villageHouses) {
    const housesFromJs = housesConfig.villageHouses.filter(h => h && h.profession !== 'decoration');
    console.log(`  📄 houses.js: ${housesFromJs.length} Gebäude`);
    allHouses.push(...housesFromJs);
  }
  
  // 2. schematics/ Ordner laden
  const schematicsDir = path.join(__dirname, '../schematics');
  console.log(`  🔍 Suche schematics-Ordner: ${schematicsDir}`);
  
  if (fs.existsSync(schematicsDir)) {
    const schematicFiles = fs.readdirSync(schematicsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`  📁 schematics/: ${schematicFiles.length} Dateien gefunden`);
    
    schematicFiles.forEach(file => {
      try {
        const filePath = path.join(schematicsDir, file);
        delete require.cache[require.resolve(filePath)];
        
        const schematicModule = require(filePath);
        const houses = schematicModule.villageHouses || [];
        console.log(`    ✅ ${file}: ${houses.length} Gebäude`);
        allHouses.push(...houses.filter(h => h && h.profession !== 'decoration'));
      } catch (e) {
        console.error(`    ❌ ${file}: ${e.message}`);
      }
    });
  } else {
    console.warn(`  ⚠️ schematics/ Ordner nicht gefunden unter: ${schematicsDir}`);
  }
  
  console.log(`🎉 Gesamt: ${allHouses.length} Gebäude geladen`);
  return allHouses;
}

// ===== DATABASE FUNCTIONS =====
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Fehler beim Erstellen von /data:', e.message);
  }
}

function loadBuildingsDb() {
  try {
    ensureDataDir();
    if (!fs.existsSync(BUILDINGS_DB_FILE)) {
      return { buildings: [] };
    }
    const raw = fs.readFileSync(BUILDINGS_DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && parsed.buildings ? parsed : { buildings: [] };
  } catch (e) {
    console.warn('Fehler beim Laden von buildings.json:', e.message);
    return { buildings: [] };
  }
}

function saveBuildingsDb(db) {
  try {
    ensureDataDir();
    fs.writeFileSync(BUILDINGS_DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.warn('Fehler beim Speichern von buildings.json:', e.message);
  }
}

function isBuildingFinished(villageId, buildingIndex) {
  try {
    const db = loadBuildingsDb();
    return db.buildings && db.buildings.some(b => b.villageId === villageId && b.index === buildingIndex);
  } catch (e) {
    return false;
  }
}

function markBuildingAsFinished(villageId, buildingIndex, placement, doorRel, houseSize) {
  try {
    const db = loadBuildingsDb();
    if (!db.buildings) db.buildings = [];
    if (!db.buildings.some(b => b.villageId === villageId && b.index === buildingIndex)) {
      db.buildings.push({
        villageId,
        index: buildingIndex,
        name: placement.house?.name || 'unknown',
        x: placement.x,
        y: placement.y,
        z: placement.z,
        doorDx: doorRel.dx,
        doorDz: doorRel.dz,
        doorDy: doorRel.dy,
        width: houseSize.width,
        depth: houseSize.depth,
        finishedAt: new Date().toISOString()
      });
      saveBuildingsDb(db);
    }
  } catch (e) {
    console.warn('Fehler in markBuildingAsFinished:', e.message);
  }
}

function registerOrUpdateVillage(centerX, centerY, centerZ, houseCount) {
  try {
    const db = { villages: [] };
    try {
      if (fs.existsSync(VILLAGES_DB_FILE)) {
        const raw = fs.readFileSync(VILLAGES_DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        db.villages = parsed.villages || [];
      }
    } catch (e) {}

    const villageId = `village_${centerX}_${centerY}_${centerZ}`;
    let village = db.villages.find(v => v.id === villageId);
    if (!village) {
      village = {
        id: villageId,
        centerX,
        centerY,
        centerZ,
        houseCount,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      db.villages.push(village);
    } else {
      village.lastModified = new Date().toISOString();
    }

    ensureDataDir();
    fs.writeFileSync(VILLAGES_DB_FILE, JSON.stringify(db, null, 2));
    return villageId;
  } catch (e) {
    console.warn('Fehler in registerOrUpdateVillage:', e.message);
    return `village_${centerX}_${centerY}_${centerZ}`;
  }
}

// ===== COMMUNICATION FUNCTIONS =====
async function sendStatus(bot, message) {
  console.log("SENDSTATUS:", message);
  if (bot && typeof bot.whisper === "function" && process.env.AUTHORIZED_USER)
    bot.whisper(process.env.AUTHORIZED_USER, message);
  
  if (DISCORD_WEBHOOK_URL) {
    const dataObj = { content: String(message || '[NO MESSAGE]') };
    const data = JSON.stringify(dataObj);
    const url = new URL(DISCORD_WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'MinecraftVillageBot'
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        console.log('Discord Webhook response:', res.statusCode, body);
      });
    });

    req.on('error', error => {
      console.error('Fehler beim Senden des Discord Webhooks:', error);
    });

    req.write(data);
    req.end();
  }
}

// ===== HELPER FUNCTIONS =====
function findDoorInPattern(pattern) {
  if (!pattern) return { dx: 0, dz: 0, dy: 0 };
  
  if (!Array.isArray(pattern)) {
    if (pattern.blocks) {
      pattern = [pattern];
    } else {
      return { dx: 0, dz: 0, dy: 0 };
    }
  }
  
  for (const layer of pattern) {
    if (!layer || !layer.blocks || !Array.isArray(layer.blocks)) continue;
    
    for (let dz = 0; dz < layer.blocks.length; dz++) {
      const row = layer.blocks[dz];
      if (!row) continue;
      
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] === 'd') {
          return { dx, dz, dy: layer.y || 0 };
        }
      }
    }
  }
  
  const firstLayer = Array.isArray(pattern) ? pattern[0] : pattern;
  return {
    dx: Math.floor((firstLayer?.blocks?.[0]?.length || 7) / 2),
    dz: Math.floor(firstLayer?.blocks?.length / 2 || 3),
    dy: firstLayer?.y || 0
  };
}

function distance2D(x1, z1, x2, z2) {
  return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
}

// ===== ROAD BUILDING =====
async function buildRoad(bot, buildingX, buildingZ, doorRel, houseWidth, houseDepth, centerX, centerZ, y) {
  const roadY = y;
  const doorX = buildingX + doorRel.dx;
  const doorZ = buildingZ + doorRel.dz;
  
  console.log(`🛣️ Baue Straße von Tür (${doorX}, ${doorZ}) zum Zentrum (${centerX}, ${centerZ})`);
  console.log(`🛣️ Distanz: ${Math.round(distance2D(doorX, doorZ, centerX, centerZ))} Blöcke`);

  let x = doorX;
  let z = doorZ;
  let steps = 0;
  const MAX_STEPS = 100;

  while (distance2D(x, z, centerX, centerZ) > 1 && steps < MAX_STEPS) {
    if (!global.botState.isBuilding) {
      console.log('⏹️ Straßenbau abgebrochen');
      return;
    }

    const deltaX = Math.sign(centerX - x);
    const deltaZ = Math.sign(centerZ - z);

    if (Math.abs(centerX - x) > Math.abs(centerZ - z)) {
      x += deltaX;
    } else {
      z += deltaZ;
    }

    await bot.chat(`/setblock ${Math.floor(x)} ${roadY} ${Math.floor(z)} ${ROAD_BLOCK}`);
    await bot.chat(`/setblock ${Math.floor(x+1)} ${roadY} ${Math.floor(z)} ${ROAD_BLOCK}`);
    
    for (let yv = roadY + 1; yv <= roadY + 4; yv++) {
      await bot.chat(`/setblock ${Math.floor(x)} ${yv} ${Math.floor(z)} air`);
      await bot.chat(`/setblock ${Math.floor(x+1)} ${yv} ${Math.floor(z)} air`);
    }

    steps++;
    await utils.sleep(200);

    if (steps % 10 === 0) {
      console.log(`🛣️ Straße: ${steps}/${MAX_STEPS} Schritte, Distanz: ${Math.round(distance2D(x, z, centerX, centerZ))}`);
    }
  }

  if (steps >= MAX_STEPS) {
    console.warn(`⚠️ Straßenbau bei MAX_STEPS=${MAX_STEPS} gestoppt`);
  } else {
    console.log(`✅ Straße komplett (${steps} Schritte)`);
  }
}

// ===== TERRAIN PREPARATION - Dynamische Flächenberechnung =====
async function flattenArea(bot, area) {
  const width = area.x2 - area.x1;
  const depth = area.z2 - area.z1;
  console.log(`🧹 Räume Bereich ${width}×${depth} bei Y=${area.y}...`);

  for (let x = area.x1; x <= area.x2; x++) {
    if (!global.botState.isBuilding) return;
    
    for (let z = area.z1; z <= area.z2; z++) {
      if (!global.botState.isBuilding) return;

      for (let yv = area.y - 3; yv < area.y; yv++) {
        await bot.chat(`/setblock ${x} ${yv} ${z} ${FILL_BLOCK}`);
        await utils.sleep(40);
      }

      await bot.chat(`/setblock ${x} ${area.y} ${z} ${FILL_BLOCK}`);
      await utils.sleep(40);

      for (let yv = area.y + 1; yv <= 130; yv++) {
        await bot.chat(`/setblock ${x} ${yv} ${z} air`);
        await utils.sleep(30);
      }
    }
  }

  console.log('✅ Gelände vorbereitet');
}

// ===== CHAT HANDLER =====
function setupChatHandler(bot) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    const authorizedUsers = ['derlemue', '[Server]', 'Server'];
    if (!authorizedUsers.includes(username)) return;

    console.log(`[CHAT-${username}] ${message}`);
    const msgLower = message.toLowerCase().trim();

    if (msgLower === '!help') {
      bot.chat('🆘 Befehle: !build x y z N | !stop | !status | !help');
      return;
    }

    if (msgLower.startsWith('!build ')) {
      const parts = message.trim().split(' ');
      if (parts.length === 5) {
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const z = parseInt(parts[3]);
        const N = parseInt(parts[4]);
        if (!isNaN(x) && !isNaN(y) && !isNaN(z) && !isNaN(N)) {
          global.botState.isBuilding = true;
          global.botState.buildCoords = { x, y, z };
          global.botState.buildHouseCount = N;
          saveState(global.botState);
          bot.chat(`🏗️ Starte Dorfbau bei (${x}, ${y}, ${z}) mit ${N} Gebäuden`);
          setTimeout(() => {
            bot.emit('buildVillage', x, y, z, N);
          }, 1000);
          return;
        }
      }
      bot.chat('❌ !build x y z N (z.B. !build 100 64 100 50)');
      return;
    }

    if (msgLower === '!stop') {
      global.botState.isBuilding = false;
      saveState(global.botState);
      bot.chat('⏹️ Alle Prozesse gestoppt');
      return;
    }

    if (msgLower === '!status') {
      let statusMsg = '';
      if (global.botState.isBuilding) {
        statusMsg = `🏗️ BAUEND: Gebäude ${global.botState.buildIndex || 0}/${global.botState.buildHouseCount || '?'} bei (${global.botState.buildCoords?.x || '?'}, ${global.botState.buildCoords?.y || '?'}, ${global.botState.buildCoords?.z || '?'})`;
      } else {
        statusMsg = '⏸️ INAKTIV';
      }
      bot.chat(statusMsg);
      return;
    }
  });

  console.log('✅ Chat-Handler eingerichtet');
}

// ===== MAIN FUNCTIONS mit DYNAMISCHER RÄUMFLÄCHE! =====
module.exports = {
  setupChatHandler,

  async buildVillage(bot, centerX, centerY, centerZ, houseCount) {
    console.log(`🏗️ Starte Dorfbau bei (${centerX}, ${centerY}, ${centerZ}) mit ${houseCount} Gebäuden`);
    await sendStatus(bot, `🏗️ Dorfbau gestartet: ${houseCount} Gebäude`);

    const houses = loadAllHouses();
    if (houses.length === 0) {
      await sendStatus(bot, '❌ Keine Gebäude gefunden! Prüfe houses.js und schematics/');
      return;
    }

    const placements = this.planVillageLayout(centerX, centerY, centerZ, houseCount, houses);
    const villageId = registerOrUpdateVillage(centerX, centerY, centerZ, houseCount);

    // Bewege Bot zum Zentrum
    await movement.moveToPosition(bot, centerX, centerY + 2, centerZ, 5);
    await utils.sleep(1000);

    for (let i = global.botState.buildIndex || 0; i < placements.length; i++) {
      if (!global.botState.isBuilding) break;

      const placement = placements[i];
      const house = placement.house;
      
      if (isBuildingFinished(villageId, i)) {
        console.log(`⏭️ Gebäude ${i + 1}/${placements.length} übersprungen`);
        continue;
      }

      console.log(`🏠 Baue ${house.name} (${house.width}x${house.depth}) bei (${placement.x}, ${centerY}, ${placement.z})`);
      
      // ✅ GEFIXTE DYNAMISCHE RÄUMFLÄCHE - EXAKT!
      const clearWidth = house.width + (AREA_PADDING * 2);
      const clearDepth = house.depth + (AREA_PADDING * 2);
      const halfWidth = Math.floor(house.width / 2);
      const halfDepth = Math.floor(house.depth / 2);
      
      const clearArea = {
        x1: placement.x - halfWidth - AREA_PADDING,
        x2: placement.x + halfWidth + AREA_PADDING,
        z1: placement.z - halfDepth - AREA_PADDING,
        z2: placement.z + halfDepth + AREA_PADDING,
        y: centerY
      };
      
      console.log(`🧹 Räume Bereich ${clearWidth}×${clearDepth} bei Y=${centerY}...`);
      
      // Bewege zur Baustelle
      await movement.moveToBuildingSite(bot, { x: placement.x, z: placement.z, y: centerY });
      await utils.sleep(1000);
      
      // ✅ Nur EINE flattenArea - mit dynamischer Berechnung!
      await flattenArea(bot, clearArea);

      await this.buildStructure(bot, placement.x, centerY, placement.z, house);

      const doorRel = findDoorInPattern(house.pattern);

      await buildRoad(bot, placement.x, placement.z, doorRel, 
                     house.width || 7, house.depth || 7, 
                     centerX, centerZ, centerY);

      markBuildingAsFinished(villageId, i, placement, doorRel, {
        width: house.width || 7, 
        depth: house.depth || 7
      });
      
      global.botState.buildIndex = i + 1;
      saveState(global.botState);
      
      await sendStatus(bot, `✅ Gebäude ${i + 1}/${placements.length} fertig: ${house.name} (${house.width}x${house.depth})`);
      await utils.sleep(4000);
    }

    await sendStatus(bot, '🎉 Dorfbau komplett!');
    global.botState.isBuilding = false;
    global.botState.buildIndex = 0;
    saveState(global.botState);
  },

  planVillageLayout(centerX, centerY, centerZ, houseCount, houses) {
    const placements = [];
    let placed = 0;
    
    while (placed < houseCount) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + placed * 3;
      const x = Math.floor(centerX + distance * Math.cos(angle));
      const z = Math.floor(centerZ + distance * Math.sin(angle));
      
      let tooClose = false;
      for (const p of placements) {
        if (Math.hypot(x - p.x, z - p.z) < 20) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        const house = houses[Math.floor(Math.random() * houses.length)];
        placements.push({ x, y: centerY, z, house });
        placed++;
      }
    }
    
    return placements;
  },

  async buildStructure(bot, x, y, z, houseConfig) {
    console.log(`🔨 Baue ${houseConfig.name}`);
    
    if (!Array.isArray(houseConfig.pattern)) {
      console.warn('❌ Ungültiges Pattern-Format');
      return false;
    }

    const halfWidth = Math.floor(houseConfig.width / 2);
    const halfDepth = Math.floor(houseConfig.depth / 2);

    for (const layer of houseConfig.pattern) {
      if (!layer.blocks || !Array.isArray(layer.blocks)) continue;
      
      for (let dz = 0; dz < layer.blocks.length; dz++) {
        const row = layer.blocks[dz];
        if (!row) continue;
        
        for (let dx = 0; dx < row.length; dx++) {
          const symbol = row[dx];
          if (symbol === '.') continue;
          
          const material = houseConfig.materials[symbol];
          if (material) {
            const pos = new Vec3(
              x + dx - halfWidth, 
              y + (layer.y || 0), 
              z + dz - halfDepth
            );
            await bot.chat(`/setblock ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)} ${material}`);
            await utils.sleep(200);
          }
        }
      }
    }
    
    console.log(`✅ ${houseConfig.name} gebaut`);
    return true;
  }
};
