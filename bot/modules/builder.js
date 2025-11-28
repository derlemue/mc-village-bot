const { GoalNear } = require('mineflayer-pathfinder').goals;
const Vec3 = require('vec3');
const fs = require('fs');
const path = require('path');
const housesConfig = require('../config/houses');
const utils = require('./utils');
const { saveState } = require('./persistence');
const https = require('https');

const BUILD_DELAY = 50; // Schnell!
const ATTACK_RANGE = 8;
const ATTACK_COOLDOWN = 1000;

const ROAD_BLOCK = 'brick';
const FILL_BLOCK = 'chiseled_stone_bricks';
const LANTERN_BLOCK = 'lantern';
const LANTERN_BASE = 'stone_bricks';
const AREA_PADDING = 10;
const BUILD_SPACING = 10;

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function findDoorInPattern(pattern) {
  // 1. Pattern-Array-Sicherheit für alle (!) Gebäudetypen
  if (!pattern) return { dx: 0, dz: 0, dy: 0 };
  if (!Array.isArray(pattern) && pattern.blocks) pattern = [pattern];

  for (const layer of pattern) {
    for (let dz = 0; dz < layer.blocks.length; dz++) {
      const row = layer.blocks[dz];
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] === 'd') {
          return { dx, dz, dy: layer.y };
        }
      }
    }
  }

  const firstLayer = Array.isArray(pattern) ? pattern[0] : pattern;
  return {
    dx: Math.floor((firstLayer.blocks?.[0]?.length || 7) / 2),
    dz: Math.floor(firstLayer.blocks?.length / 2 || 3),
    dy: firstLayer.y || 0
  };
}

async function safeSetBlockViaCommand(bot, pos, blockType, blockState = null) {
  let blockName = blockType;
  if (!blockName.includes('minecraft:')) blockName = `minecraft:${blockType}`;
  if (blockState) blockName += `[${blockState}]`;
  const targetName = blockType.replace('minecraft:', '').toLowerCase();
  const block = bot.blockAt(pos);

  if (block && block.name && block.name.toLowerCase() === targetName) return true;

  for (let tries = 0; tries < 3; tries++) {
    bot.chat(`/setblock ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)} ${blockName}`);
    await utils.sleep(50);
    const afterBlock = bot.blockAt(pos);
    if (afterBlock && (afterBlock.name.toLowerCase() === targetName || afterBlock.name.toLowerCase().includes(targetName.split('_')[0]))) return true;
  }
  console.warn(`❌ Block ${blockType} konnte nicht gesetzt werden bei ${pos.toString()}`);
  return false;
}

async function buildRoad(bot, buildingX, buildingZ, doorRel, houseWidth, houseDepth, centerX, centerZ, y) {
  const roadY = y;
  const doorX = buildingX + doorRel.dx;
  const doorZ = buildingZ + doorRel.dz;

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
    if (!global.botState.isBuilding) return;

    await attackNearbyMobs(bot);

    // Bewegungsrichtung
    const deltaX = Math.sign(centerX - x);
    const deltaZ = Math.sign(centerZ - z);

    // Diagonale Bewegung: 4 Blöcke breit
    if (deltaX !== 0 && deltaZ !== 0) {
      x += deltaX;
      z += deltaZ;

      // Setze 4 Blöcke (2x2 Feld, überlappend)
      for (let dx = 0; dx < 2; dx++) {
        for (let dz = 0; dz < 2; dz++) {
          await safeSetBlockViaCommand(bot, new Vec3(x + dx, roadY, z + dz), ROAD_BLOCK);
          // 4 Blöcke Luft über JEDEN Straßenblock
          for (let yv = roadY + 1; yv <= roadY + 4; yv++) {
            await safeSetBlockViaCommand(bot, new Vec3(x + dx, yv, z + dz), 'air');
          }
        }
      }
    } else {
      // Gerade Bewegung: 2 Blöcke breit
      if (deltaX !== 0 && deltaZ === 0) x += deltaX;
      if (deltaZ !== 0 && deltaX === 0) z += deltaZ;

      await safeSetBlockViaCommand(bot, new Vec3(x, roadY, z), ROAD_BLOCK);
      await safeSetBlockViaCommand(bot, new Vec3(x + 1, roadY, z), ROAD_BLOCK);
      // Luft über beiden Straßenblöcken
      for (let yv = roadY + 1; yv <= roadY + 4; yv++) {
        await safeSetBlockViaCommand(bot, new Vec3(x, yv, z), 'air');
        await safeSetBlockViaCommand(bot, new Vec3(x + 1, yv, z), 'air');
  
