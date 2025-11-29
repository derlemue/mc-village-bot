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
const ROAD_BLOCK = 'brick';
const FILL_BLOCK = 'chiseled_stone_bricks';
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
  const schematicsDir = path.join(__dirname, '../config/schematics');
  if (fs.existsSync(schematicsDir)) {
    const schematicFiles = fs.readdirSync(schematicsDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    console.log(`  📁 schematics/: ${schematicFiles.length} Dateien`);
    
    schematicFiles.forEach(file => {
      try {
        const schematicModule = require(path.join(schematicsDir, file));
        const houses = schematicModule.villageHouses || [];
        console.log(`    ✅ ${file}: ${houses.length} Gebäude`);
        allHouses.push(...houses.filter(h => h && h.profession !== 'decoration'));
      } catch (e) {
        console.error(`    ❌ ${file}: ${e.message}`);
      }
    });
  } else {
    console.log('  ⏭️ schematics/ Ordner nicht gefunden');
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

// ===== ROAD BUILDING (2x GESCHWINDIGKEIT) =====
async
