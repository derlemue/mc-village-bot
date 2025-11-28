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
/**
 * Prüft ob ein Block "weich" ist (nicht tragfähig)
 * Weiche Blöcke: Luft, Wasser, Lava, Laub, Sand, Schnee, etc.
 */
function isSoftBlock(block) {
  if (!block || block.name === 'air' || block.name === 'cave_air') return true;
  
  const softBlockNames = [
    'water', 'lava',
    'oak_leaves', 'spruce_leaves', 'birch_leaves', 'jungle_leaves', 'acacia_leaves', 'dark_oak_leaves',
    'mangrove_leaves', 'cherry_leaves',
    'sand', 'red_sand', 'gravel', 'powder_snow',
    'grass', 'seagrass', 'tall_seagrass',
    'snow', 'snow_block',
    'cobweb',
    'nether_wart', 'warped_wart_block'
  ];
  
  return softBlockNames.some(name => block.name.includes(name));
}

/**
 * Prüft die Untergrundqualität und bestimmt die Fundament-Tiefe
 * Rückgabe: 16 für weiches Material, 3 für solides Material
 */
function determineFoundationDepth(bot, area) {
  // Prüfe mehrere Punkte um sicherzustellen
  const checkPoints = [
    { x: area.x1, z: area.z1 },
    { x: area.x2, z: area.z1 },
    { x: area.x1, z: area.z2 },
    { x: area.x2, z: area.z2 },
    { x: Math.floor((area.x1 + area.x2) / 2), z: Math.floor((area.z1 + area.z2) / 2) }
  ];

  let softBlockCount = 0;

  for (const point of checkPoints) {
    // Prüfe den Block direkt unter der Baugrundhöhe
    const pos = new Vec3(point.x, area.y - 1, point.z);
    const block = bot.blockAt(pos);
    
    if (isSoftBlock(block)) {
      softBlockCount++;
    }
  }

  // Wenn mehr als 50% der Punkte weich sind, nutze 16 Blöcke, sonst 3
  const needsDeepFoundation = softBlockCount > (checkPoints.length / 2);
  const depth = needsDeepFoundation ? 16 : 3;
  
  console.log(`🏗️ Untergrund-Check: ${softBlockCount}/${checkPoints.length} weiche Blöcke → Fundament-Tiefe: ${depth} Blöcke`);
  
  return depth;
}

// ===== PATTERN FUNCTIONS =====
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

// ===== TERRAIN FUNCTIONS =====
async function flattenArea(bot, area) {
  const width = area.x2 - area.x1 + 1;
  const depth = area.z2 - area.z1 + 1;
  console.log(`🧹 Räume Bereich ${width}×${depth} bis Y=128 frei...`);

  // ✅ Lade Chunks BEVOR wir bauen
  await loadChunksForArea(bot, area);

  // ✅ Bestimme Fundament-Tiefe basierend auf Untergrund
  const foundationDepth = determineFoundationDepth(bot, area);

  for (let x = area.x1; x <= area.x2; x++) {
    if (!global.botState.isBuilding) {
      console.log('⏹️ Geländevorbereitung abgebrochen');
      return;
    }

    for (let z = area.z1; z <= area.z2; z++) {
      if (!global.botState.isBuilding) return;

      // --- PHASE 1: Unterfüllung mit dynamischer Tiefe ---
      for (let yv = area.y - foundationDepth; yv < area.y; yv++) {
        if (!global.botState.isBuilding) return;
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, yv, z), FILL_BLOCK);
        await utils.sleep(6);
      }

      // --- PHASE 2: Gebäude-Level setzen ---
      if (!global.botState.isBuilding) return;
      await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, area.y, z), FILL_BLOCK);
      await utils.sleep(6);

      // --- PHASE 3: Alles über dem Level entfernen ---
      for (let yv = area.y + 1; yv <= 128; yv++) {
        if (!global.botState.isBuilding) return;
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, yv, z), 'air');
        await utils.sleep(10);
      }
    }
  }

  if (!global.botState.isBuilding) return;

  // --- PHASE 4: Second Pass für heruntergefallene Blöcke ---
  console.log(`🧹 Second Pass für heruntergefallene Blöcke...`);
  await utils.sleep(1000);

  for (let x = area.x1; x <= area.x2; x++) {
    if (!global.botState.isBuilding) return;

    for (let z = area.z1; z <= area.z2; z++) {
      if (!global.botState.isBuilding) return;

      for (let yv = area.y + 1; yv <= 128; yv++) {
        if (!global.botState.isBuilding) return;

        const pos = new Vec3(x, yv, z);
        const block = bot.blockAt(pos);

        if (block && block.name !== 'air') {
          await blockUtils.safeSetBlockViaCommand(bot, pos, 'air');
          await utils.sleep(10);
        } else {
          break;
        }
      }
    }
  }

  console.log('✅ Geländevorbereitung abgeschlossen');
}

// ===== ROAD FUNCTIONS =====
async function buildRoad(bot, buildingX, buildingZ, doorRel, houseWidth, houseDepth, centerX, centerZ, y) {
  const roadY = y;
  const doorX = buildingX + doorRel.dx;
  const doorZ = buildingZ + doorRel.dz;

  const minX = buildingX - Math.floor(houseWidth / 2) - 2;
  const maxX = buildingX + Math.floor(houseWidth / 2) + 2;
  const minZ = buildingZ - Math.floor(houseDepth / 2) - 2;
  const maxZ = buildingZ + Math.floor(houseDepth / 2) + 2;

  console.log(`🛣️ Baue Straße: 2 Blöcke breit (gerade), 4 Blöcke breit (diagonal mit ${ROAD_OVERLAP} Blöcke Überlappung)`);
  console.log(`🛣️ Von Tür (${doorX}, ${doorZ}) zum Zentrum (${centerX}, ${centerZ})`);

  // ✅ Lade Chunks um die Straße
  await loadChunksAround(bot, centerX, centerZ);

  let x, z;
  if (Math.abs(doorX - centerX) > Math.abs(doorZ - centerZ)) {
    x = doorX + (doorX < centerX ? -2 : 2);
    z = doorZ;
  } else {
    x = doorX;
    z = doorZ + (doorZ < centerZ ? -2 : 2);
  }

  let steps = 0;
  while (x !== centerX || z !== centerZ) {
    if (!global.botState.isBuilding) {
      console.log('⏹️ Straßenbau abgebrochen');
      return;
    }

    await attackNearbyMobs(bot);

    const moveX = Math.abs(centerX - x) > Math.abs(centerZ - z) ? Math.sign(centerX - x) : 0;
    const moveZ = Math.abs(centerZ - z) > Math.abs(centerX - x) ? Math.sign(centerZ - z) : 0;

    let nextX = x + moveX;
    let nextZ = z + moveZ;

    if (!(nextX >= minX && nextX <= maxX && nextZ >= minZ && nextZ <= maxZ)) {
      x = nextX;
      z = nextZ;

      if (!global.botState.isBuilding) return;

      if (moveX !== 0 && moveZ !== 0) {
        // ===== DIAGONALE: 4 Blöcke breit mit 2 Blöcke Überlappung =====
        console.log(`  ↗️ Diagonal-Schritt: Setze 4 Blöcke breit mit Überlappung`);
        
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, roadY, z), ROAD_BLOCK);
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + 1, roadY, z), ROAD_BLOCK);
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, roadY, z + 1), ROAD_BLOCK);
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + 1, roadY, z + 1), ROAD_BLOCK);

        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + moveX, roadY, z), ROAD_BLOCK);
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + moveX, roadY, z + 1), ROAD_BLOCK);

        for (let yv = roadY + 1; yv <= roadY + ROAD_AIR_HEIGHT; yv++) {
          if (!global.botState.isBuilding) return;
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, yv, z), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + 1, yv, z), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, yv, z + 1), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + 1, yv, z + 1), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + moveX, yv, z), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + moveX, yv, z + 1), 'air');
          await utils.sleep(10);
        }
      } else {
        // ===== GERADE: 2 Blöcke breit =====
        const isHorizontal = moveX !== 0;
        console.log(`  ${isHorizontal ? '→' : '↓'} Gerade-Schritt: Setze 2 Blöcke breit`);
        
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, roadY, z), ROAD_BLOCK);
        await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + (isHorizontal ? 1 : 0), roadY, z + (isHorizontal ? 0 : 1)), ROAD_BLOCK);

        for (let yv = roadY + 1; yv <= roadY + ROAD_AIR_HEIGHT; yv++) {
          if (!global.botState.isBuilding) return;
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x, yv, z), 'air');
          await blockUtils.safeSetBlockViaCommand(bot, new Vec3(x + (isHorizontal ? 1 : 0), yv, z + (isHorizontal ? 0 : 1)), 'air');
          await utils.sleep(10);
        }
      }

      if (steps % 6 === 0) {
        const lx = x + 2, lz = z;
        const grassPos = new Vec3(lx, roadY - 1, lz);
        const abovePos = new Vec3(lx, roadY, lz);
        const blockBelow = bot.blockAt(grassPos);
        const blockAbove = bot.blockAt(abovePos);
        if (blockBelow && blockBelow.name === LANTERN_BASE &&
            (blockAbove.name === 'air' || blockAbove.name === 'cave_air')) {
          await blockUtils.safeSetBlockViaCommand(bot, grassPos, LANTERN_BASE);
          await blockUtils.safeSetBlockViaCommand(bot, abovePos, LANTERN_BLOCK);
        }
      }
    } else {
      if (moveX !== 0 && moveZ === 0) {
        nextZ = z + Math.sign(centerZ - z);
        if (!(nextX >= minX && nextX <= maxX && nextZ >= minZ && nextZ <= maxZ)) {
          z = nextZ;
        } else {
          x = nextX;
        }
      } else if (moveX === 0 && moveZ !== 0) {
        nextX = x + Math.sign(centerX - x);
        if (!(nextX >= minX && nextX <= maxX && nextZ >= minZ && nextZ <= maxZ)) {
          x = nextX;
        } else {
          z = nextZ;
        }
      }
    }

    steps++;
    await utils.sleep(24);
  }

  console.log(`✅ Straße komplett (${steps} Schritte)`);
}

async function positionBotForDoor(bot, baseX, baseY, baseZ, doorRel, facing) {
  const doorX = baseX + doorRel.dx;
  const doorY = baseY + doorRel.dy + 1;
  const doorZ = baseZ + doorRel.dz;
  let botX, botZ;
  switch (facing) {
    case 'north': botX = doorX; botZ = doorZ + 3; break;
    case 'south': botX = doorX; botZ = doorZ - 3; break;
    case 'east': botX = doorX - 3; botZ = doorZ; break;
    case 'west': botX = doorX + 3; botZ = doorZ; break;
    default: botX = doorX; botZ = doorZ + 3;
  }

  if (bot.game && bot.game.gameMode === 1) {
    bot.entity.position.set(botX, doorY, botZ);
  } else {
    try {
      await bot.pathfinder.goto(new GoalNear(botX, doorY, botZ, 1));
    } catch (e) {
      console.log('Bot-Bewegung zur Tür fehlgeschlagen');
    }
  }

  await utils.sleep(500);
  console.log(`🤖 Bot positioniert vor Tür bei ${botX},${doorY},${botZ} (facing=${facing})`);
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
      bot.chat('⏹️ Stoppe Erkundung');
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
      console.log(`Status abgefragt: ${statusMsg}`);
      return;
    }
  });

  console.log('✅ Chat-Handler eingerichtet - Befehle: !explore, !build x y z N, !stop, !status, !help');
}

// ===== MAIN EXPORTS =====
module.exports = {
  setupChatHandler,
  
  async buildVillage(bot, centerX, centerY, centerZ, houseCount) {
    if (bot.game && bot.game.gameMode === 1) {
      bot.entity.position.set(centerX, centerY + 2, centerZ);
    } else {
      try {
        await bot.pathfinder.goto(new GoalNear(centerX, centerY + 2, centerZ, 2));
      } catch {
        console.log('Bewegung zum Bauzentrum fehlgeschlagen');
      }
    }

    houseCount = houseCount || utils.randomInt(30, 90);
    const villageId = registerOrUpdateVillage(centerX, centerY, centerZ, houseCount);

    // ✅ NEU: Stelle sicher dass Chunks um das Dorf geladen sind
    await ensureChunksLoaded(bot, centerX, centerZ);

    if (!global.botState.buildCoords ||
        global.botState.buildCoords.x !== centerX ||
        global.botState.buildCoords.y !== centerY ||
        global.botState.buildCoords.z !== centerZ) {
      global.botState.buildIndex = 0;
      global.botState.buildHouseCount = houseCount;
      global.botState.buildCoords = { x: centerX, y: centerY, z: centerZ };
      saveState(global.botState);
    }

    await sendStatus(bot, `🏗️ Starte Dorfbau bei (${centerX}, ${centerY}, ${centerZ}) mit ${houseCount} Gebäuden`);

    const placements = this.planVillageLayout(centerX, centerY, centerZ, houseCount);
    const levelY = centerY;

    for (let i = global.botState.buildIndex || 0; i < placements.length; i++) {
      if (!global.botState.isBuilding) break;

      if (isBuildingFinished(villageId, i)) {
        console.log(`⏭️ Gebäude ${i + 1} von ${placements.length} übersprungen (bereits fertig)`);
        continue;
      }

      if (bot.game && bot.game.gameMode === 1) {
        bot.entity.position.set(placements[i].x, levelY + 2, placements[i].z);
        await utils.sleep(200);
      } else {
        try {
          await bot.pathfinder.goto(new GoalNear(placements[i].x, levelY + 2, placements[i].z, 2));
        } catch {
          console.log('Bewegung zur Baustelle fehlgeschlagen');
        }
      }

      await attackNearbyMobs(bot);

      const info = `🏗️ Baue Gebäude ${i + 1} von ${placements.length}: ${placements[i].house.name}`;
      console.log(info);
      await sendStatus(bot, info);

      const g = placements[i].house;
      const area = utils.areaCoords(
        placements[i].x, levelY,
        placements[i].z,
        (g.width || 7) + AREA_PADDING,
        (g.depth || g.length || 7) + AREA_PADDING
      );

      await flattenArea(bot, area);
      if (!global.botState.isBuilding) break;

      const success = await this.buildStructure(bot, placements[i].x, levelY, placements[i].z, g, i + 1, placements.length);
      if (!global.botState.isBuilding) break;

      if (success) {
        const doorRel = findDoorInPattern(g.pattern);
        const houseSize = { width: g.width || 7, depth: g.depth || g.length || 7 };
        markBuildingAsFinished(villageId, i, placements[i], doorRel, houseSize);
        global.botState.buildIndex = i + 1;
        saveState(global.botState);

        const doneMsg = `✅ Gebäude ${i + 1} von ${placements.length} fertig gebaut (${placements[i].house.name})`;
        await sendStatus(bot, doneMsg);

        await buildRoad(bot, placements[i].x, placements[i].z, doorRel, houseSize.width, houseSize.depth, centerX, centerZ, levelY);
        if (!global.botState.isBuilding) break;
      }

      if (!global.botState.isBuilding) break;
      await utils.sleep(5000);
    }

    await sendStatus(bot, '✅ Dorfbau abgeschlossen');
    global.botState.isBuilding = false;
    global.botState.buildIndex = null;
    global.botState.buildHouseCount = null;
    saveState(global.botState);
  },

  planVillageLayout(centerX, centerY, centerZ, houseCount) {
    const placements = [];
    const spacing = housesConfig.villageLayout?.spacing || 8;
    const houses = housesConfig.villageHouses?.filter(h => h.profession !== 'decoration') || [];

    let placed = 0, attempts = 0;
    while (placed < houseCount && attempts < houseCount * 10) {
      const angle = Math.random() * Math.PI * 2;
      const radius = spacing + placed * (BUILD_SPACING + 5);
      const x = Math.floor(centerX + radius * Math.cos(angle));
      const z = Math.floor(centerZ + radius * Math.sin(angle));
      const y = centerY;

      let minDist = Infinity;
      for (const existing of placements) {
        const dist = Math.hypot(x - existing.x, z - existing.z);
        if (dist < minDist) minDist = dist;
      }

      if (minDist < BUILD_SPACING + 5) {
        attempts++;
        continue;
      }

      const house = houses[utils.randomInt(0, houses.length - 1)] || houses[0];
      placements.push({ x, y, z, house });
      placed++;
    }

    return placements;
  },

  async buildStructure(bot, x, y, z, houseConfig, idx, total) {
    await attackNearbyMobs(bot);

    const doorRel = findDoorInPattern(houseConfig.pattern);
    let blocksPlaced = 0;

    for (const layer of houseConfig.pattern) {
      for (let dz = 0; dz < layer.blocks.length; dz++) {
        if (!global.botState.isBuilding) return false;

        const row = layer.blocks[dz];
        for (let dx = 0; dx < row.length; dx++) {
          if (!global.botState.isBuilding) return false;

          const symbol = row[dx];
          if (symbol === 'd') continue;
          if (symbol !== '.') {
            const materialName = houseConfig.materials[symbol];
            if (!materialName) continue;

            const blockPos = new Vec3(x + dx, y + layer.y, z + dz);
            await blockUtils.safeSetBlockViaCommand(bot, blockPos, materialName);
            await utils.sleep(60);
            blocksPlaced++;

            if (blocksPlaced % 15 === 0) {
              await attackNearbyMobs(bot);
            }
          }
        }
      }
    }

    let doorPlaced = false;
    const doorMaterial = houseConfig.materials['d'] || 'oak_door';

    for (let doorAttempt = 0; doorAttempt < 3 && !doorPlaced; doorAttempt++) {
      await attackNearbyMobs(bot);

      if (await blockUtils.canPlaceDoor(bot, x, y, z, doorRel)) {
        const facing = blockUtils.detectDoorFacingAttachedOutside(bot, x, y, z, doorRel);
        await positionBotForDoor(bot, x, y, z, doorRel, facing);
        await blockUtils.clearPathForDoor(bot, x, y, z, doorRel);
        doorPlaced = await blockUtils.placeDoor(bot, x, y, z, doorRel, doorMaterial, facing);
      } else {
        console.log(`⏳ Türrahmen noch nicht bereit (Versuch ${doorAttempt + 1}/3)`);
        await utils.sleep(2000);
      }
    }

    return true;
  }
};
