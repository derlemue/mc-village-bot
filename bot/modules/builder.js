const { GoalNear } = require('mineflayer-pathfinder').goals;
const Vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

// ===== IMPORTS =====
const housesConfig = require('../config/houses');
const utils = require('./utils');
const { saveState } = require('./persistence');
const https = require('https');

// FALLBACK CONSTANTS (da constants.js fehlt)
const BUILD_DELAY = 90;
const ATTACK_RANGE = 8;
const ATTACK_COOLDOWN = 1000;
const ROAD_BLOCK = 'brick';
const FILL_BLOCK = 'chiseled_stone_bricks';
const LANTERN_BLOCK = 'lantern';
const LANTERN_BASE = 'stone_bricks';
const AREA_PADDING = 10;
const BUILD_SPACING = 10;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ROAD_AIR_HEIGHT = 4;
const DATA_DIR = './data';
const BUILDINGS_DB_FILE = './data/buildings.json';
const VILLAGES_DB_FILE = './data/villages.json';

// ===== MULTI-TEMPLATE LOADER =====
function loadAllTemplates() {
  const templatesDir = path.join(__dirname, '../config/templates');
  const allHouses = [];
  
  if (!fs.existsSync(templatesDir)) {
    console.warn('⚠️ templates/ Verzeichnis nicht gefunden - fallback zu houses.js');
    if (housesConfig && housesConfig.villageHouses) {
      return housesConfig.villageHouses.filter(h => h.profession !== 'decoration');
    }
    return [];
  }

  const templateFiles = fs.readdirSync(templatesDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  console.log(`📁 Lade ${templateFiles.length} Template-Dateien:`);
  
  templateFiles.forEach(file => {
    try {
      const templateModule = require(path.join(templatesDir, file));
      const houses = templateModule.villageHouses || [];
      console.log(`  ✅ ${file}: ${houses.length} Häuser`);
      allHouses.push(...houses);
    } catch (e) {
      console.error(`❌ Fehler bei ${file}:`, e.message);
    }
  });

  console.log(`🎉 Gesamt: ${allHouses.length} verfügbare Gebäude`);
  return allHouses.filter(h => h.profession !== 'decoration');
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

// ===== MOB FUNCTIONS =====
async function attackNearbyMobs(bot) {
  if (!bot.entity || !bot.entities) return false;
  
  const mobs = Object.values(bot.entities).filter(e =>
    e.type === 'mob' &&
    e.position.distanceTo(bot.entity.position) <= ATTACK_RANGE &&
    e.position.distanceTo(bot.entity.position) > 0 &&
    e.name !== 'villager' &&
    e.name !== 'cat' &&
    e.name !== 'iron_golem'
  );

  if (mobs.length === 0) return false;

  mobs.sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position));
  const mob = mobs[0];
  
  if (!mob) return false;

  try {
    await bot.lookAt(mob.position.offset(0, mob.height / 2, 0));
    bot.attack(mob);
    console.log(`⚔️ Angriff auf Mob: ${mob.name} (${Math.round(mob.position.distanceTo(bot.entity.position))} Blöcke)`);
    await utils.sleep(ATTACK_COOLDOWN);
    return true;
  } catch (e) {
    console.log(`Mob-Angriff fehlgeschlagen: ${e.message}`);
    return false;
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

// ===== FIXED ROAD BUILDING (MAX 100 STEPS) =====
async function buildRoad(bot, buildingX, buildingZ, doorRel, houseWidth, houseDepth, centerX, centerZ, y) {
  const roadY = y;
  const doorX = buildingX + doorRel.dx;
  const doorZ = buildingZ + doorRel.dz;
  
  console.log(`🛣️ Baue Straße von Tür (${doorX}, ${doorZ}) zum Zentrum (${centerX}, ${centerZ})`);
  console.log(`🛣️ Distanz: ${Math.round(distance2D(doorX, doorZ, centerX, centerZ))} Blöcke`);

  let x = doorX;
  let z = doorZ;
  let steps = 0;
  const MAX_STEPS = 100; // 🛑 ENDLOSSCHLEIFE FIX

  while (distance2D(x, z, centerX, centerZ) > 1 && steps < MAX_STEPS) {
    if (!global.botState.isBuilding) {
      console.log('⏹️ Straßenbau abgebrochen');
      return;
    }

    await attackNearbyMobs(bot);

    // Einfache Manhattan-Bewegung zum Zentrum
    const deltaX = Math.sign(centerX - x);
    const deltaZ = Math.sign(centerZ - z);

    // Priorisiere X oder Z Bewegung (keine Diagonalen mehr)
    if (Math.abs(centerX - x) > Math.abs(centerZ - z)) {
      x += deltaX;
    } else {
      z += deltaZ;
    }

    // 2 Blöcke breit Straße
    await bot.chat(`/setblock ${Math.floor(x)} ${roadY} ${Math.floor(z)} ${ROAD_BLOCK}`);
    await bot.chat(`/setblock ${Math.floor(x+1)} ${roadY} ${Math.floor(z)} ${ROAD_BLOCK}`);
    
    // 4 Blöcke Luft darüber
    for (let yv = roadY + 1; yv <= roadY + 4; yv++) {
      await bot.chat(`/setblock ${Math.floor(x)} ${yv} ${Math.floor(z)} air`);
      await bot.chat(`/setblock ${Math.floor(x+1)} ${yv} ${Math.floor(z)} air`);
    }

    steps++;
    await utils.sleep(100);

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

// ===== FIXED TERRAIN PREP (NUR EINMAL PRO GEBÄUDE) =====
async function flattenArea(bot, area) {
  const width = area.x2 - area.x1 + 1;
  const depth = area.z2 - area.z1 + 1;
  console.log(`🧹 Räume Bereich ${width}×${depth} bei Y=${area.y}...`);

  // Einfache Flachmachung - KEINE CHUNKS (vereinfacht)
  for (let x = area.x1; x <= area.x2; x++) {
    if (!global.botState.isBuilding) return;
    
    for (let z = area.z1; z <= area.z2; z++) {
      if (!global.botState.isBuilding) return;

      // Fundament (3 Blöcke tief)
      for (let yv = area.y - 3; yv < area.y; yv++) {
        await bot.chat(`/setblock ${x} ${yv} ${z} ${FILL_BLOCK}`);
        await utils.sleep(20);
      }

      // Boden
      await bot.chat(`/setblock ${x} ${area.y} ${z} ${FILL_BLOCK}`);
      await utils.sleep(20);

      // Alles darüber entfernen (bis Y=130)
      for (let yv = area.y + 1; yv <= 130; yv++) {
        await bot.chat(`/setblock ${x} ${yv} ${z} air`);
        await utils.sleep(15);
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
      bot.chat('🆘 Befehle: !explore | !build x y z N | !stop | !status | !help');
      return;
    }

    if (msgLower === '!explore') {
      global.botState.isExploring = true;
      global.botState.isBuilding = false;
      saveState(global.botState);
      bot.chat('🧭 Starte Kartenerkundung');
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
          global.botState.isExploring = false;
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
      global.botState.isExploring = false;
      saveState(global.botState);
      bot.chat('⏹️ Alle Prozesse gestoppt');
      return;
    }

    if (msgLower === '!status') {
      let statusMsg = '';
      if (global.botState.isBuilding) {
        statusMsg = `🏗️ BAUEND: Gebäude ${global.botState.buildIndex || 0}/${global.botState.buildHouseCount || '?'} bei (${global.botState.buildCoords?.x || '?'}, ${global.botState.buildCoords?.y || '?'}, ${global.botState.buildCoords?.z || '?'})`;
      } else if (global.botState.isExploring) {
        statusMsg = '🧭 ERKUNDUNG: Aktiv';
      } else {
        statusMsg = '⏸️ INAKTIV';
      }
      bot.chat(statusMsg);
      return;
    }
  });

  console.log('✅ Chat-Handler eingerichtet');
}

// ===== MAIN FUNCTIONS =====
module.exports = {
  setupChatHandler,

  async buildVillage(bot, centerX, centerY, centerZ, houseCount) {
    console.log(`🏗️ Starte Dorfbau bei (${centerX}, ${centerY}, ${centerZ}) mit ${houseCount} Gebäuden`);
    await sendStatus(bot, `🏗️ Dorfbau gestartet: ${houseCount} Gebäude`);

    const houses = loadAllTemplates();
    if (houses.length === 0) {
      await sendStatus(bot, '❌ Keine Templates gefunden!');
      return;
    }

    const placements = this.planVillageLayout(centerX, centerY, centerZ, houseCount, houses);
    const villageId = registerOrUpdateVillage(centerX, centerY, centerZ, houseCount);

    for (let i = global.botState.buildIndex || 0; i < placements.length; i++) {
      if (!global.botState.isBuilding) break;

      if (isBuildingFinished(villageId, i)) {
        console.log(`⏭️ Gebäude ${i + 1}/${placements.length} übersprungen`);
        continue;
      }

      const placement = placements[i];
      const house = placement.house;
      
      console.log(`🏠 Baue ${house.name} bei (${placement.x}, ${centerY}, ${placement.z})`);
      
      // 1. Gelände FLAT (NUR EINMAL)
      const area = {
        x1: placement.x - 8, x2: placement.x + 8,
        z1: placement.z - 8, z2: placement.z + 8,
        y: centerY
      };
      await flattenArea(bot, area);

      // 2. Gebäude BAUEN
      await this.buildStructure(bot, placement.x, centerY, placement.z, house);

      // 3. Straße (FIXED - MAX 100 Schritte)
      const doorRel = findDoorInPattern(house.pattern);
      await buildRoad(bot, placement.x, placement.z, doorRel, 
                     house.width || 7, house.depth || 7, 
                     centerX, centerZ, centerY);

      // 4. Als fertig markieren
      markBuildingAsFinished(villageId, i, placement, doorRel, {
        width: house.width || 7, 
        depth: house.depth || 7
      });
      
      global.botState.buildIndex = i + 1;
      saveState(global.botState);
      
      await sendStatus(bot, `✅ Gebäude ${i + 1}/${placements.length} fertig: ${house.name}`);
      await utils.sleep(2000); // Pause zwischen Gebäuden
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
      
      // Einfacher Abstand-Check
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
    
    // Baue Layer für Layer
    if (!Array.isArray(houseConfig.pattern)) {
      console.warn('❌ Ungültiges Pattern-Format');
      return false;
    }

    for (const layer of houseConfig.pattern) {
      if (!layer.blocks || !Array.isArray(layer.blocks)) continue;
      
      for (let dz = 0; dz < layer.blocks.length; dz++) {
        const row = layer.blocks[dz];
        if (!row) continue;
        
        for (let dx = 0; dx < row.length; dx++) {
          const symbol = row[dx];
          if (symbol === '.' || symbol === 'd') continue;
          
          const material = houseConfig.materials[symbol];
          if (material) {
            const pos = new Vec3(x + dx, y + (layer.y || 0), z + dz);
            await bot.chat(`/setblock ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)} ${material}`);
            await utils.sleep(100);
          }
        }
      }
    }
    
    console.log(`✅ ${houseConfig.name} gebaut`);
    return true;
  }
};
