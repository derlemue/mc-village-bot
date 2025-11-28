// modules/chunkLoader.js
const { CHUNK_LOAD_RADIUS } = require('./constants');
const utils = require('./utils');

/**
 * Prüft ob ein Chunk geladen ist
 */
function isChunkLoaded(bot, chunkX, chunkZ) {
  try {
    // Mineflayer speichert Chunks in bot.world.chunks
    if (bot.world && bot.world.chunks) {
      const key = `${chunkX},${chunkZ}`;
      return bot.world.chunks.has(key);
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Lädt Chunks um eine Position herum
 * ✅ FIX: Nutzt jetzt die richtige Mineflayer-API
 */
async function loadChunksAround(bot, centerX, centerZ) {
  const chunkX = Math.floor(centerX / 16);
  const chunkZ = Math.floor(centerZ / 16);

  console.log(`📦 Lade Chunks um (${centerX}, ${centerZ}) - Chunk (${chunkX}, ${chunkZ})...`);
  console.log(`  Radius: ${CHUNK_LOAD_RADIUS} Chunks in jede Richtung`);

  const chunksToLoad = [];
  
  for (let cx = chunkX - CHUNK_LOAD_RADIUS; cx <= chunkX + CHUNK_LOAD_RADIUS; cx++) {
    for (let cz = chunkZ - CHUNK_LOAD_RADIUS; cz <= chunkZ + CHUNK_LOAD_RADIUS; cz++) {
      chunksToLoad.push({ cx, cz });
    }
  }

  console.log(`  Insgesamt ${chunksToLoad.length} Chunks zu laden...`);

  let loadedCount = 0;
  let attemptCount = 0;
  const maxAttempts = 10;

  while (loadedCount < chunksToLoad.length && attemptCount < maxAttempts) {
    attemptCount++;
    let nowLoaded = 0;

    for (const { cx, cz } of chunksToLoad) {
      if (isChunkLoaded(bot, cx, cz)) {
        nowLoaded++;
      }
    }

    if (nowLoaded === chunksToLoad.length) {
      console.log(`✅ Alle Chunks geladen (${chunksToLoad.length}/${chunksToLoad.length})`);
      return true;
    }

    loadedCount = nowLoaded;
    console.log(`⏳ Warte auf Chunks... ${loadedCount}/${chunksToLoad.length} geladen (Versuch ${attemptCount}/${maxAttempts})`);
    await utils.sleep(500);
  }

  if (loadedCount < chunksToLoad.length) {
    console.warn(`⚠️ Nicht alle Chunks geladen nach ${maxAttempts} Versuchen (${loadedCount}/${chunksToLoad.length})`);
    console.warn(`   Fahre trotzdem fort, aber Blockplatzierung könnte fehlschlagen`);
  }

  return loadedCount === chunksToLoad.length;
}

/**
 * Lädt Chunks für einen ganzen Bereich
 */
async function loadChunksForArea(bot, area) {
  const minChunkX = Math.floor(area.x1 / 16);
  const maxChunkX = Math.floor(area.x2 / 16);
  const minChunkZ = Math.floor(area.z1 / 16);
  const maxChunkZ = Math.floor(area.z2 / 16);

  console.log(`📦 Lade Chunks für Bereich X[${area.x1}-${area.x2}] Z[${area.z1}-${area.z2}]`);
  console.log(`   Chunk-Bereich: CX[${minChunkX}-${maxChunkX}] CZ[${minChunkZ}-${maxChunkZ}]`);

  const chunksToLoad = [];
  
  for (let cx = minChunkX - CHUNK_LOAD_RADIUS; cx <= maxChunkX + CHUNK_LOAD_RADIUS; cx++) {
    for (let cz = minChunkZ - CHUNK_LOAD_RADIUS; cz <= maxChunkZ + CHUNK_LOAD_RADIUS; cz++) {
      chunksToLoad.push({ cx, cz });
    }
  }

  let loadedCount = 0;
  let attemptCount = 0;
  const maxAttempts = 15;

  while (loadedCount < chunksToLoad.length && attemptCount < maxAttempts) {
    attemptCount++;
    let nowLoaded = 0;

    for (const { cx, cz } of chunksToLoad) {
      if (isChunkLoaded(bot, cx, cz)) {
        nowLoaded++;
      }
    }

    if (nowLoaded === chunksToLoad.length) {
      console.log(`✅ Alle ${chunksToLoad.length} Chunks geladen`);
      return true;
    }

    loadedCount = nowLoaded;
    if (attemptCount % 3 === 0) {
      console.log(`⏳ Chunk-Laden: ${loadedCount}/${chunksToLoad.length} (${Math.round((loadedCount/chunksToLoad.length)*100)}%)`);
    }
    await utils.sleep(300);
  }

  if (loadedCount < chunksToLoad.length) {
    console.warn(`⚠️ Warnung: Nur ${loadedCount}/${chunksToLoad.length} Chunks geladen`);
  }

  return loadedCount === chunksToLoad.length;
}

module.exports = {
  loadChunksAround,
  loadChunksForArea,
  isChunkLoaded
};
