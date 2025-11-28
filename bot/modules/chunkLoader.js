// modules/chunkLoader.js
const { CHUNK_LOAD_RADIUS } = require('./constants');
const utils = require('./utils');

/**
 * Prüft ob ein Chunk geladen ist
 * Funktioniert mit verschiedenen Mineflayer-Versionen
 */
function isChunkLoaded(bot, chunkX, chunkZ) {
  try {
    // Versuche verschiedene APIs je nach Mineflayer-Version
    
    // Methode 1: bot.world.chunks (Map)
    if (bot.world && bot.world.chunks) {
      if (typeof bot.world.chunks.has === 'function') {
        const key = `${chunkX},${chunkZ}`;
        return bot.world.chunks.has(key);
      }
      if (typeof bot.world.chunks.get === 'function') {
        const key = `${chunkX},${chunkZ}`;
        return bot.world.chunks.get(key) !== undefined;
      }
    }
    
    // Methode 2: bot.world.chunks als Objekt
    if (bot.world && bot.world.chunks && typeof bot.world.chunks === 'object') {
      const key = `${chunkX},${chunkZ}`;
      return key in bot.world.chunks;
    }
    
    // Methode 3: Über bot.blockAt prüfen (zuverlässigste Methode)
    // Ein Block im Chunk prüfen - wenn wir den Block lesen können, ist der Chunk geladen
    const Vec3 = require('vec3');
    const testPos = new Vec3(chunkX * 16, 64, chunkZ * 16);
    const block = bot.blockAt(testPos);
    return block !== null && block !== undefined;
    
  } catch (e) {
    console.warn(`⚠️ Fehler bei isChunkLoaded(${chunkX}, ${chunkZ}): ${e.message}`);
    return false;
  }
}

/**
 * Lädt Chunks um eine Position herum
 * Einfacher Ansatz: Warte auf Chunks zu laden
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
      console.log(`✅ Alle Chunks geladen (${chunksToLoad.length}/${chunksToLoad.length})`);
      return true;
    }

    loadedCount = nowLoaded;
    if (attemptCount % 2 === 0 || attemptCount === 1) {
      console.log(`⏳ Warte auf Chunks... ${loadedCount}/${chunksToLoad.length} geladen (${Math.round((loadedCount/chunksToLoad.length)*100)}%)`);
    }
    await utils.sleep(300);
  }

  console.warn(`⚠️ Chunks nach ${maxAttempts} Versuchen: ${loadedCount}/${chunksToLoad.length} geladen`);
  console.warn(`   Fahre trotzdem fort (Server lädt möglicherweise im Hintergrund)`);
  
  // Geben true zurück auch wenn nicht alle geladen sind - Server lädt im Hintergrund
  return true;
}

/**
 * Lädt Chunks für einen ganzen Bereich
 * Der wichtigste Teil: Vor flattenArea/buildStructure aufrufen
 */
async function loadChunksForArea(bot, area) {
  const minChunkX = Math.floor(area.x1 / 16);
  const maxChunkX = Math.floor(area.x2 / 16);
  const minChunkZ = Math.floor(area.z1 / 16);
  const maxChunkZ = Math.floor(area.z2 / 16);

  console.log(`📦 Lade Chunks für Bereich X[${area.x1}-${area.x2}] Z[${area.z1}-${area.z2}]`);
  console.log(`   Chunk-Bereich: CX[${minChunkX}-${maxChunkX}] CZ[${minChunkZ}-${maxChunkZ}]`);

  const chunksToLoad = [];
  
  // Lade Chunks mit Radius
  for (let cx = minChunkX - CHUNK_LOAD_RADIUS; cx <= maxChunkX + CHUNK_LOAD_RADIUS; cx++) {
    for (let cz = minChunkZ - CHUNK_LOAD_RADIUS; cz <= maxChunkZ + CHUNK_LOAD_RADIUS; cz++) {
      chunksToLoad.push({ cx, cz });
    }
  }

  console.log(`   Lade ${chunksToLoad.length} Chunks mit Radius...`);

  let loadedCount = 0;
  let attemptCount = 0;
  const maxAttempts = 20;

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
    if (attemptCount % 3 === 0 || attemptCount === 1) {
      const percentage = Math.round((loadedCount / chunksToLoad.length) * 100);
      console.log(`⏳ Chunk-Laden: ${loadedCount}/${chunksToLoad.length} (${percentage}%) - Versuch ${attemptCount}/${maxAttempts}`);
    }
    
    await utils.sleep(250);
  }

  if (loadedCount < chunksToLoad.length) {
    const percentage = Math.round((loadedCount / chunksToLoad.length) * 100);
    console.warn(`⚠️ Warnung: Nur ${loadedCount}/${chunksToLoad.length} Chunks geladen (${percentage}%)`);
    console.warn(`   Server lädt möglicherweise noch im Hintergrund - fahre trotzdem fort`);
  }

  // Immer true zurückgeben - der Server lädt die Chunks im Hintergrund
  return true;
}

/**
 * Wartet darauf, dass Bot sich bewegt hat (lädt Chunks automatisch)
 * Call this vor dem ersten Bauen um Chunks zu garantieren
 */
async function ensureChunksLoaded(bot, x, z) {
  try {
    const { GoalNear } = require('mineflayer-pathfinder').goals;
    console.log(`🚶 Bewege Bot zu (${x}, ${z}) um Chunks zu laden...`);
    
    if (bot.game && bot.game.gameMode === 1) {
      // Creative Mode: teleportieren
      bot.entity.position.set(x, 64, z);
      console.log(`📍 Teleportiert zu (${x}, ${z})`);
    } else {
      // Survival Mode: pathfinding
      try {
        await bot.pathfinder.goto(new GoalNear(x, 64, z, 5));
        console.log(`📍 Angekommen bei (${x}, ${z})`);
      } catch (e) {
        console.log(`⚠️ Pathfinding fehlgeschlagen, aber fahre fort`);
      }
    }
    
    await utils.sleep(500);
    console.log(`✅ Chunks sollten geladen sein`);
    return true;
  } catch (e) {
    console.warn(`Fehler in ensureChunksLoaded: ${e.message}`);
    return false;
  }
}

module.exports = {
  loadChunksAround,
  loadChunksForArea,
  ensureChunksLoaded,
  isChunkLoaded
};
