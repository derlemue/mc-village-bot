const { GoalNear } = require('mineflayer-pathfinder').goals;
const Vec3 = require('vec3');
const utils = require('./utils');
const terrain = require('./terrain');

/**
 * Bewegt Bot zur Zielposition
 * Wenn Terrain im Weg ist, wird es stufenweise abgebaut
 * @param {Object} bot - Mineflayer Bot
 * @param {number} x - Ziel-X
 * @param {number} y - Ziel-Y
 * @param {number} z - Ziel-Z
 * @param {number} maxDistance - Max Distanz zum Ziel (default 2)
 */
async function moveToPosition(bot, x, y, z, maxDistance = 2) {
  console.log(`🚶 Bewege Bot zu (${x}, ${y}, ${z})`);
  
  const goal = new GoalNear(x, y, z, maxDistance);
  
  try {
    // Versuche normalen Pathfinding
    await bot.pathfinder.goto(goal);
    console.log(`✅ Bot angekommen bei (${x}, ${y}, ${z})`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Pathfinding fehlgeschlagen: ${err.message}`);
    console.log(`🔨 Starte Terrain-Abbau zur Position...`);
    
    // Wenn Pathfinding fehlschlägt: Terrain-Abbau
    await clearPathToPosition(bot, x, y, z);
    
    // Neuer Versuch
    try {
      await bot.pathfinder.goto(goal);
      console.log(`✅ Bot angekommen bei (${x}, ${y}, ${z}) nach Terrain-Abbau`);
      return true;
    } catch (err2) {
      console.error(`❌ Auch nach Terrain-Abbau fehlgeschlagen: ${err2.message}`);
      return false;
    }
  }
}

/**
 * Baut Terrain stufenweise ab bis zur Zielposition
 * @param {Object} bot - Mineflayer Bot
 * @param {number} targetX - Ziel-X
 * @param {number} targetY - Ziel-Y
 * @param {number} targetZ - Ziel-Z
 */
async function clearPathToPosition(bot, targetX, targetY, targetZ) {
  const botPos = bot.entity.position;
  const steps = Math.ceil(botPos.distanceTo(new Vec3(targetX, targetY, targetZ)));
  
  console.log(`🔨 Räume Weg über ~${steps} Blöcke...`);

  // Berechne Richtung
  const dx = Math.sign(targetX - botPos.x) || 0;
  const dz = Math.sign(targetZ - botPos.z) || 0;

  // Gehe Schritt für Schritt zur Zielposition
  for (let step = 0; step < steps && global.botState.isBuilding; step++) {
    const checkX = Math.floor(botPos.x + dx * (step + 1));
    const checkZ = Math.floor(botPos.z + dz * (step + 1));
    
    // Räume Terrain ab diesem Punkt
    await terrain.clearTerrainColumn(bot, checkX, checkZ, targetY);
    
    await utils.sleep(800); // 4x verlangsamt (200 * 4)
  }

  console.log(`✅ Weg gerodet`);
}

/**
 * Bewegt Bot zur Baustelle eines Gebäudes
 * @param {Object} bot - Mineflayer Bot
 * @param {Object} placement - Gebäude-Platzierung {x, y, z, house}
 */
async function moveToBuildingSite(bot, placement) {
  const { x, z, y } = placement;
  const buildingY = y + 2;
  
  console.log(`🏗️ Bewege zu Baustelle: (${x}, ${buildingY}, ${z})`);
  
  return await moveToPosition(bot, x, buildingY, z, 3);
}

/**
 * Bewegt Bot zur Tür eines Gebäudes
 * @param {Object} bot - Mineflayer Bot
 * @param {number} buildingX - Gebäude-Mittelpunkt X
 * @param {number} buildingY - Gebäude-Mittelpunkt Y
 * @param {number} buildingZ - Gebäude-Mittelpunkt Z
 * @param {Object} doorRel - Tür-Position relativ: {dx, dz, dy}
 * @param {string} facing - Richtung der Tür: 'north', 'south', 'east', 'west'
 */
async function moveToBuiltDoor(bot, buildingX, buildingY, buildingZ, doorRel, facing) {
  const doorX = buildingX + doorRel.dx;
  const doorY = buildingY + doorRel.dy + 1;
  const doorZ = buildingZ + doorRel.dz;
  
  // Position vor der Tür (je nach Richtung)
  let botX, botZ;
  switch (facing) {
    case 'north': botX = doorX; botZ = doorZ + 3; break;
    case 'south': botX = doorX; botZ = doorZ - 3; break;
    case 'east': botX = doorX - 3; botZ = doorZ; break;
    case 'west': botX = doorX + 3; botZ = doorZ; break;
    default: botX = doorX; botZ = doorZ + 3;
  }

  console.log(`🚪 Bewege zur Tür bei (${doorX}, ${doorY}, ${doorZ})`);
  
  return await moveToPosition(bot, botX, doorY, botZ, 1);
}

/**
 * Prüft ob Bot sich bereits in Nähe befindet
 * @param {Object} bot - Mineflayer Bot
 * @param {number} x - Ziel-X
 * @param {number} z - Ziel-Z
 * @param {number} maxDistance - Max Distanz (default 5)
 */
function isNear(bot, x, z, maxDistance = 5) {
  const botPos = bot.entity.position;
  const distance = Math.hypot(botPos.x - x, botPos.z - z);
  return distance <= maxDistance;
}

module.exports = {
  moveToPosition,
  clearPathToPosition,
  moveToBuildingSite,
  moveToBuiltDoor,
  isNear
};
