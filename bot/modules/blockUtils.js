// modules/blockUtils.js
const Vec3 = require('vec3');
const { FILL_BLOCK, ROAD_BLOCK } = require('./constants');

/**
 * Setzt einen Block via /setblock Befehl
 * Mit Retry-Logik und Error-Handling
 */
async function safeSetBlockViaCommand(bot, pos, blockType, blockState = null) {
  let blockName = blockType;
  if (!blockName.includes('minecraft:')) blockName = `minecraft:${blockType}`;
  if (blockState) blockName += `[${blockState}]`;
  
  const targetName = blockType.replace('minecraft:', '').toLowerCase();
  const block = bot.blockAt(pos);
  
  if (block && block.name && block.name.toLowerCase() === targetName) return true;
  
  for (let tries = 0; tries < 3; tries++) {
    bot.chat(`/setblock ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)} ${blockName}`);
    await require('./utils').sleep(50);
    
    const afterBlock = bot.blockAt(pos);
    if (afterBlock && (
      afterBlock.name.toLowerCase() === targetName || 
      afterBlock.name.toLowerCase().includes(targetName.split('_')[0])
    )) {
      return true;
    }
  }
  
  console.warn(`⚠️ Block ${blockType} konnte nicht gesetzt werden bei ${pos.toString()}, aber fahre fort...`);
  return false;
}

/**
 * Detektiert die Ausrichtung der Tür basierend auf umgebenden Blöcken
 */
function detectDoorFacingAttachedOutside(bot, baseX, baseY, baseZ, doorRel) {
  const doorX = baseX + doorRel.dx;
  const doorY = baseY + doorRel.dy;
  const doorZ = baseZ + doorRel.dz;
  const northBlock = bot.blockAt(new Vec3(doorX, doorY, doorZ - 1));
  const southBlock = bot.blockAt(new Vec3(doorX, doorY, doorZ + 1));
  const westBlock = bot.blockAt(new Vec3(doorX - 1, doorY, doorZ));
  const eastBlock = bot.blockAt(new Vec3(doorX + 1, doorY, doorZ));
  
  if (northBlock && northBlock.name !== 'air') return 'south';
  if (southBlock && southBlock.name !== 'air') return 'north';
  if (westBlock && westBlock.name !== 'air') return 'east';
  if (eastBlock && eastBlock.name !== 'air') return 'west';
  return 'south';
}

/**
 * Prüft ob eine Tür platziert werden kann
 */
async function canPlaceDoor(bot, baseX, baseY, baseZ, doorRel) {
  const lowerY = baseY + doorRel.dy;
  const upperY = lowerY + 1;
  const leftLower = bot.blockAt(new Vec3(baseX + doorRel.dx - 1, lowerY, baseZ + doorRel.dz));
  const rightLower = bot.blockAt(new Vec3(baseX + doorRel.dx + 1, lowerY, baseZ + doorRel.dz));
  const leftUpper = bot.blockAt(new Vec3(baseX + doorRel.dx - 1, upperY, baseZ + doorRel.dz));
  const rightUpper = bot.blockAt(new Vec3(baseX + doorRel.dx + 1, upperY, baseZ + doorRel.dz));

  return (
    leftLower && leftLower.name !== 'air' &&
    rightLower && rightLower.name !== 'air' &&
    leftUpper && leftUpper.name !== 'air' &&
    rightUpper && rightUpper.name !== 'air'
  );
}

/**
 * Platziert eine Tür an der angegebenen Position
 */
async function placeDoor(bot, baseX, baseY, baseZ, doorRel, doorMaterial, facing) {
  const doorX = baseX + doorRel.dx;
  const doorY = baseY + doorRel.dy;
  const doorZ = baseZ + doorRel.dz;
  const lowerState = `facing=${facing},half=lower,hinge=left,open=false,powered=false`;
  const upperState = `facing=${facing},half=upper,hinge=left,open=false,powered=false`;
  const lowerPos = new Vec3(doorX, doorY, doorZ);
  const upperPos = new Vec3(doorX, doorY + 1, doorZ);

  await safeSetBlockViaCommand(bot, lowerPos, 'air');
  await safeSetBlockViaCommand(bot, upperPos, 'air');
  await require('./utils').sleep(150);

  const lowerSuccess = await safeSetBlockViaCommand(bot, lowerPos, doorMaterial, lowerState);
  await require('./utils').sleep(150);
  const upperSuccess = await safeSetBlockViaCommand(bot, upperPos, doorMaterial, upperState);

  console.log(`🚪 Tür gesetzt: lower=${lowerSuccess}, upper=${upperSuccess} (facing=${facing})`);
  return lowerSuccess && upperSuccess;
}

/**
 * Räumt den Pfad vor einer Tür frei
 */
async function clearPathForDoor(bot, baseX, baseY, baseZ, doorRel) {
  const doorX = baseX + doorRel.dx;
  const doorY = baseY + doorRel.dy;
  const doorZ = baseZ + doorRel.dz;

  for (let x = doorX - 2; x <= doorX + 2; x++) {
    for (let y = doorY - 1; y <= doorY + 3; y++) {
      for (let z = doorZ - 2; z <= doorZ + 2; z++) {
        const pos = new Vec3(x, y, z);
        const block = bot.blockAt(pos);
        if (block && block.name !== 'air') {
          await safeSetBlockViaCommand(bot, pos, 'air');
          await require('./utils').sleep(50);
        }
      }
    }
  }
}

module.exports = {
  safeSetBlockViaCommand,
  detectDoorFacingAttachedOutside,
  canPlaceDoor,
  placeDoor,
  clearPathForDoor
};
