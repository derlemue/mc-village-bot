const { GoalNear } = require('mineflayer-pathfinder').goals;
const Vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

// ===== IMPORTS =====
const housesConfig = require('../config/houses');
const utils = require('./utils');
const { saveState } = require('./persistence');
const https = require('https');
const CONSTANTS = require('./constants');
const blockUtils = require('./blockUtils');
const { loadChunksAround, loadChunksForArea, ensureChunksLoaded } = require('./chunkLoader');

const {
  BUILD_DELAY,
  ATTACK_RANGE,
  ATTACK_COOLDOWN,
  ROAD_BLOCK,
  FILL_BLOCK,
  LANTERN_BLOCK,
  LANTERN_BASE,
  AREA_PADDING,
  BUILD_SPACING,
  DISCORD_WEBHOOK_URL,
  ROAD_WIDTH_STRAIGHT,
  ROAD_WIDTH_DIAGONAL,
  ROAD_OVERLAP,
  ROAD_AIR_HEIGHT,
  DATA_DIR,
  BUILDINGS_DB_FILE,
  VILLAGES_DB_FILE
} = CONSTANTS;

// ===== MULTI-TEMPLATE LOADER =====
function loadAllTemplates() {
  const templatesDir = path.join(__dirname, '../config/templates');
  const allHouses = [];
  
  // Fallback zu houses.js wenn templates/ nicht existiert
  if (!fs.existsSync(templatesDir)) {
    console.warn('⚠️ templates/ Verzeichnis nicht gefunden - fallback zu houses.js');
    if (housesConfig.villageHouses) {
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
  
  if (DISCORD_WEBHOOK_URL)
