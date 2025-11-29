const Vec3 = require('vec3');
const utils = require('./utils');

const TERRAIN_CLEAR_BLOCK = 'air';
const CLEAR_HEIGHT = 5; // Höhe über Bot zum Freimachen

/**
 * Prüft ob ein Block "blockierend" ist (nicht durchgehbar)
 * @param {Object} block - Mineflayer Block
 */
function isBlockingBlock(block) {
  if (!block) return false;
  if (block.name === 'air' || block.name === 'cave_air') return false;
  if (block.name === 'water' || block.name === 'lava') return false;
  if (block.name.includes('leaves')) return false;
  
  // Alles andere ist blockierend
  return true;
}

/**
 * Baut eine vertikale Säule ab bis Bewegung möglich ist
 * @param {Object} bot - Mineflayer Bot
 * @param {number} x - X-Koordinate
 * @param {number} z - Z-Koordinate
 * @param {number} baseY - Basis Y-Level (wo gebaut wird)
 */
async function clearTerrainColumn(bot, x, z, baseY) {
  console.log(`🔨 Räume Spalte auf (${x}, ${z}) auf...`);

  // Prüfe ob Spalte bereits frei ist
  const botY = Math.floor(bot.entity.position.y);
  let needsClear = false;

  // Prüfe von Bot-Höhe bis 5 Blöcke nach oben
  for (let yCheck = botY; yCheck <= botY + CLEAR_HEIGHT; yCheck++) {
    const checkPos = new Vec3(x, yCheck, z);
    const block = bot.blockAt(checkPos);
    
    if (isBlockingBlock(block)) {
      needsClear = true;
      break;
    }
  }

  if (!needsClear) {
    console.log(`✅ Spalte (${x}, ${z}) bereits frei`);
    return;
  }

  // Stufenweise von oben nach unten abbauen
  console.log(`🔨 Baue blockierende Blöcke ab...`);
  
  for (let yLevel = botY + CLEAR_HEIGHT; yLevel >= baseY - 3; yLevel--) {
    if (!global.botState.isBuilding) return;

    const pos = new Vec3(x, yLevel, z);
    const block = bot.blockAt(pos);

    if (isBlockingBlock(block)) {
      try {
        await bot.chat(`/setblock ${x} ${yLevel} ${z} air`);
        console.log(`  ✓ Block auf (${x}, ${yLevel}, ${z}) entfernt`);
        await utils.sleep(600); // 4x verlangsamt (150 * 4)
      } catch (e) {
        console.warn(`  ⚠️ Fehler beim Abbau: ${e.message}`);
      }
    }
  }

  console.log(`✅ Spalte (${x}, ${z}) geräumt`);
}

/**
 * Baut ein 3x3 Quadrat Terrain ab
 * @param {Object} bot - Mineflayer Bot
 * @param {number} centerX - Mittelpunkt X
 * @param {number} centerZ - Mittelpunkt Z
 * @param {number} baseY - Basis Y-Level
 */
async function clearTerrainArea(bot, centerX, centerZ, baseY) {
  console.log(`🔨 Räume 3x3 Fläche um (${centerX}, ${centerZ}) auf...`);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (!global.botState.isBuilding) return;
      
      const x = centerX + dx;
      const z = centerZ + dz;
      
      await clearTerrainColumn(bot, x, z, baseY);
    }
  }

  console.log(`✅ 3x3 Fläche geräumt`);
}

/**
 * Baut einen rechteckigen Bereich Terrain ab
 * @param {Object} bot - Mineflayer Bot
 * @param {number} x1 - Start-X
 * @param {number} z1 - Start-Z
 * @param {number} x2 - End-X
 * @param {number} z2 - End-Z
 * @param {number} baseY - Basis Y-Level
 */
async function clearTerrainRectangle(bot, x1, z1, x2, z2, baseY) {
  const width = Math.abs(x2 - x1);
  const depth = Math.abs(z2 - z1);
  
  console.log(`🔨 Räume Rechteck ${width}×${depth} Blöcke auf...`);

  for (let x = x1; x <= x2; x++) {
    if (!global.botState.isBuilding) return;
    
    for (let z = z1; z <= z2; z++) {
      if (!global.botState.isBuilding) return;
      
      await clearTerrainColumn(bot, x, z, baseY);
    }
  }

  console.log(`✅ Rechteck geräumt`);
}

/**
 * Prüft ob Weg zum Ziel frei ist (grobe Prüfung)
 * @param {Object} bot - Mineflayer Bot
 * @param {number} targetX - Ziel-X
 * @param {number} targetZ - Ziel-Z
 * @param {number} botY - Bot Y-Level
 */
function isPathClear(bot, targetX, targetZ, botY) {
  // Vereinfachte Prüfung: Schaue auf direktem Weg
  const dx = Math.sign(targetX - bot.entity.position.x);
  const dz = Math.sign(targetZ - bot.entity.position.z);
  
  // Prüfe 5 Punkte auf Linie
  for (let step = 1; step <= 5; step++) {
    const checkX = Math.floor(bot.entity.position.x + dx * step);
    const checkZ = Math.floor(bot.entity.position.z + dz * step);
    
    for (let yCheck = botY; yCheck <= botY + CLEAR_HEIGHT; yCheck++) {
      const block = bot.blockAt(new Vec3(checkX, yCheck, checkZ));
      if (isBlockingBlock(block)) {
        return false;
      }
    }
  }
  
  return true;
}

module.exports = {
  clearTerrainColumn,
  clearTerrainArea,
  clearTerrainRectangle,
  isPathClear,
  isBlockingBlock
};
