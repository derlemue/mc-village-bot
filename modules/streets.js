// streets.js - KOMPLETT GEFIXT FÜR ERSTES GEBÄUDE + FALLBACK

const fs = require('fs');
const path = require('path');

class StreetBuilder {
  constructor(bot, villageManager) {
    this.bot = bot;
    this.villageManager = villageManager;
    this.streetsFile = path.join(process.cwd(), 'data', 'streets.json');
    this.streets = this.loadStreets();
    this.villages = this.villageManager.villages;
    this.ensureDataDir();
  }

  ensureDataDir() {
    const dataDir = path.dirname(this.streetsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadStreets() {
    try {
      if (fs.existsSync(this.streetsFile)) {
        const content = fs.readFileSync(this.streetsFile, 'utf8');
        if (content.trim()) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.log('StreetBuilder Load streets Fehler:', e.message);
    }
    return [];
  }

  saveStreets() {
    try {
      fs.writeFileSync(this.streetsFile, JSON.stringify(this.streets, null, 2), 'utf8');
    } catch (e) {
      console.log('StreetBuilder Save streets Fehler:', e.message);
    }
  }

  isPositionInAnyBuilding(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        const width = building.width || 16;
        const depth = building.depth || 16;
        if (x >= building.x && x < building.x + width &&
            z >= building.z && z < building.z + depth) {
          return true;
        }
      }
    }
    return false;
  }

  getDoorDirection(doorX, doorZ, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;
    if (doorZ === building.z)
      return { stepX: 0, stepZ: 1 };
    if (doorX === building.x)
      return { stepX: 1, stepZ: 0 };
    if (doorX === building.x + width - 1)
      return { stepX: -1, stepZ: 0 };
    return { stepX: 0, stepZ: 1 };
  }

  // ✅ FALLBACK: Finde nächsten sicheren Punkt am Rand
  findNearestSafePoint(buildY, doorX, doorZ, building) {
    console.log(`🔍 FALLBACK: Suche nächsten sicheren Punkt`);
    const width = building.width || 16;
    const depth = building.depth || 16;
    
    const candidates = [
      // Vorderseite
      { x: doorX, z: building.z - 1, dist: 0 },
      // Linke Seite
      { x: building.x - 1, z: doorZ, dist: 0 },
      // Rechte Seite
      { x: building.x + width, z: doorZ, dist: 0 },
      // Rückseite
      { x: doorX, z: building.z + depth, dist: 0 }
    ];

    // Berechne Distanzen und filtere sichere Punkte
    const safePoints = candidates.filter(p => {
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInAnyBuilding(p.x + ox, p.z + oz)) {
            return false;
          }
        }
      }
      return true;
    });

    if (safePoints.length === 0) {
      console.log('❌ Kein sicherer Punkt gefunden! Verwende Tür-Position');
      return { x: doorX, z: doorZ - 1 };
    }

    // Sortiere nach Distanz zur Tür
    safePoints.forEach(p => {
      p.dist = Math.abs(p.x - doorX) + Math.abs(p.z - doorZ);
    });
    safePoints.sort((a, b) => a.dist - b.dist);

    const nearest = safePoints[0];
    console.log(`✅ Sicherer Punkt gefunden: ${nearest.x},${nearest.z}`);
    return { x: nearest.x, z: nearest.z };
  }

  async buildStreetToBuildingEdge(buildY, startX, startZ, building) {
    console.log(`🛣️ Phase1: Finde Rand von ${startX},${startZ}`);
    const direction = this.getDoorDirection(startX, startZ, building);
    const pathPoints = [];
    let currentX = startX;
    let currentZ = startZ;
    
    for (let i = 0; i < 32; i++) {
      let safe = true;
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInAnyBuilding(currentX + ox, currentZ + oz)) {
            safe = false;
            break;
          }
        }
        if (!safe) break;
      }
      if (!safe) {
        console.log(`🛑 Gebäude bei ${currentX},${currentZ}`);
        break;
      }
      pathPoints.push({ x: currentX, z: currentZ });
      currentX += direction.stepX;
      currentZ += direction.stepZ;
    }
    
    if (pathPoints.length === 0) {
      console.log('❌ Kein Rand gefunden - verwende nächsten sicheren Punkt');
      return null; // FALLBACK wird woanders behandelt
    }
    
    const edgeX = pathPoints[pathPoints.length - 1].x;
    const edgeZ = pathPoints[pathPoints.length - 1].z;
    console.log(`✅ Rand gefunden: ${edgeX},${edgeZ}`);
    
    await this.clearAbove(buildY, startX, startZ, edgeX, edgeZ);
    await this.buildPath(buildY, startX, startZ, edgeX, edgeZ);
    return { x: edgeX, z: edgeZ };
  }

  isPathFree(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInAnyBuilding(currentX + ox, currentZ + oz)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 20) {
    console.log('🔍 Suche Umweg...');
    const offsets = [];
    for (let dist = 1; dist <= maxAttempts; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist <= 5) {
        offsets.push([dist, dist], [dist, -dist], [-dist, dist], [-dist, -dist]);
      }
    }
    for (const [ox, oz] of offsets) {
      const testX1 = x1 + ox;
      const testZ1 = z1 + oz;
      const testX2 = x2 + ox;
      const testZ2 = z2 + oz;
      if (this.isPathFree(buildY, testX1, testZ1, testX2, testZ2)) {
        console.log(`✅ Umweg gefunden: offset ${ox},${oz}`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    console.log('❌ Kein Umweg gefunden!');
    return null;
  }

  // ✅ NEU: Straße vom Gebäude zum Village-Zentrum
  async buildStreetToVillageCentrum(buildY, building, village) {
    console.log(`🛣️ ERSTES GEBÄUDE: Baue Straße zu Village-Zentrum`);
    
    const doorX = building.x + (building.doorPos?.x || 8);
    const doorZ = building.z + (building.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1;

    const centrumX = village.centerX;
    const centrumZ = village.centerZ;

    console.log(`📍 Von: ${fromStartX},${fromStartZ} -> Zentrum: ${centrumX},${centrumZ}`);

    // Versuche Phase 1
    let fromEdge = await this.buildStreetToBuildingEdge(buildY, fromStartX, fromStartZ, building);
    
    // ✅ FALLBACK: Wenn kein Rand gefunden, verwende nächsten sicheren Punkt
    if (!fromEdge) {
      console.log('⚠️ Phase1 Fallback: Verwende nächsten sicheren Punkt');
      fromEdge = this.findNearestSafePoint(buildY, doorX, doorZ, building);
    }

    console.log(`🛣️ Phase2: ${fromEdge.x},${fromEdge.z} -> ${centrumX},${centrumZ}`);

    let path2 = { x1: fromEdge.x, z1: fromEdge.z, x2: centrumX, z2: centrumZ };
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }

    if (!path2) {
      console.log('❌ Straße zum Zentrum fehlgeschlagen');
      return;
    }

    console.log(`✅ Phase2: Baue Straße ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2}`);
    await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);

    this.streets.push({
      from: { name: `${building.name}-edge`, x: fromEdge.x, z: fromEdge.z },
      to: { name: 'village-center', x: centrumX, z: centrumZ },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
    console.log('💾 Straße zu Zentrum gespeichert');
  }

  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    console.log(`🛣️ StreetBuilder START: ${fromBuilding.name} -> ${toBuilding.name}`);
    
    const doorX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    const doorZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1;
    
    let fromEdge = await this.buildStreetToBuildingEdge(buildY, fromStartX, fromStartZ, fromBuilding);
    
    // ✅ FALLBACK: Wenn kein Rand, verwende nächsten sicheren Punkt
    if (!fromEdge) {
      console.log('⚠️ Fallback: Verwende nächsten sicheren Punkt');
      fromEdge = this.findNearestSafePoint(buildY, doorX, doorZ, fromBuilding);
    }
    
    const toDoorX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    const toDoorZ = toBuilding.z + (toBuilding.doorPos?.z || 0);
    const toStartX = toDoorX;
    const toStartZ = toDoorZ - 1;
    
    console.log(`🛣️ Phase2: ${fromEdge.x},${fromEdge.z} -> ${toStartX},${toStartZ}`);
    
    let path2 = { x1: fromEdge.x, z1: fromEdge.z, x2: toStartX, z2: toStartZ };
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }
    
    if (!path2) {
      console.log('❌ Phase2 kein Pfad gefunden');
      return;
    }
    
    console.log(`✅ Phase2: Baue Straße ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2}`);
    await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    
    this.streets.push({
      from: { name: `${fromBuilding.name}-edge`, x: fromEdge.x, z: fromEdge.z },
      to: { name: `${toBuilding.name}-door`, x: toStartX, z: toStartZ },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
    console.log('💾 Straße gespeichert');
  }

  async buildStreet(buildY, target) {
    let fromBuilding, toBuilding, targetX, targetZ;
    if (typeof target === 'object' && target.x !== undefined && target.z !== undefined) {
      targetX = target.x;
      targetZ = target.z;
      fromBuilding = this.streets[this.streets.length - 1]?.to || null;
    } else if (typeof target === 'object' && target.name) {
      toBuilding = target;
      fromBuilding = this.streets[this.streets.length - 1]?.to || null;
    }
    let fromX, fromZ;
    if (fromBuilding) {
      fromX = fromBuilding.x;
      fromZ = fromBuilding.z;
    } else {
      fromX = this.villages[0]?.buildings?.[0]?.x || 0;
      fromZ = this.villages[0]?.buildings?.[0]?.z || 0;
    }
    let finalX2, finalZ2;
    if (targetX !== undefined) {
      finalX2 = targetX;
      finalZ2 = targetZ;
    } else {
      finalX2 = toBuilding.x + (toBuilding.doorPos?.x || 8);
      finalZ2 = toBuilding.z + (toBuilding.doorPos?.z || 0) - 1;
    }
    let path = { x1: fromX, z1: fromZ, x2: finalX2, z2: finalZ2 };
    if (!this.isPathFree(buildY, fromX, fromZ, finalX2, finalZ2)) {
      path = this.findValidPath(buildY, fromX, fromZ, finalX2, finalZ2);
    }
    if (!path) return;
    await this.clearAbove(buildY, path.x1, path.z1, path.x2, path.z2);
    await this.buildPath(buildY, path.x1, path.z1, path.x2, path.z2);
    await this.buildStreetLanterns(buildY, path.x1, path.z1, path.x2, path.z2);
    this.streets.push({
      from: { name: fromBuilding?.name || 'village-center', x: path.x1, z: path.z1 },
      to: { name: toBuilding?.name || `coord:${path.x2},${path.z2}`, x: path.x2, z: path.z2 },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  async buildLanternPosts(buildY, building) {
    console.log(`🗼 Baue Laternen um ${building.name}`);
    const width = building.width || 16;
    const depth = building.depth || 16;
    const interval = 6, offset = 1;
    const minX = building.x - offset, maxX = building.x + width + offset;
    const minZ = building.z - offset, maxZ = building.z + depth + offset;
    const positions = [];
    for (let x = minX; x <= maxX; x += interval) {
      positions.push({ x, z: minZ }, { x, z: maxZ });
    }
    for (let z = minZ; z <= maxZ; z += interval) {
      positions.push({ x: minX, z }, { x: maxX, z });
    }
    const seen = new Set();
    for (const pos of positions) {
      const key = `${pos.x},${pos.z}`;
      if (!seen.has(key)) {
        await this.placeLantern(buildY, pos.x, pos.z);
        seen.add(key);
      }
    }
  }

  async clearAbove(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          for (let clearY = buildY + 1; clearY <= buildY + 5; clearY++) {
            this.bot.chat(`/setblock ${currentX + ox} ${clearY} ${currentZ + oz} air`);
            await new Promise(r => setTimeout(r, 10));
          }
        }
      }
    }
  }

  async buildPath(buildY, x1, z1, x2, z2) {
    console.log(`🧱 Baue Straße ${x1},${z1} -> ${x2},${z2}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          this.bot.chat(`/setblock ${currentX + ox} ${buildY} ${currentZ + oz} stone_bricks`);
          await new Promise(r => setTimeout(r, 20));
        }
      }
    }
    console.log(`✅ Straße fertig`);
  }

  async buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`💡 Baue Straßenlaternen`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 6;
    const isHorizontal = Math.abs(dx) >= Math.abs(dz);
    const leftOff = isHorizontal ? [0, 3] : [-3, 0];
    const rightOff = isHorizontal ? [0, -3] : [3, 0];
    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      await this.placeLantern(buildY, currentX + leftOff[0], currentZ + leftOff[1]);
      await this.placeLantern(buildY, currentX + rightOff[0], currentZ + rightOff[1]);
    }
  }

  async placeLantern(buildY, x, z) {
    this.bot.chat(`/setblock ${x} ${buildY} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 100));
    this.bot.chat(`/setblock ${x} ${buildY + 1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 100));
  }
}

module.exports = StreetBuilder;
