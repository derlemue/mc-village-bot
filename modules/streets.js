// streets.js - OPTIMIZED WITH /FILL COMMANDS

const fs = require('fs');
const path = require('path');
const CommandHelper = require('./commandHelper');

class StreetBuilder {
  constructor(bot, villageManager) {
    this.bot = bot;
    this.villageManager = villageManager;
    this.commandHelper = new CommandHelper(bot);
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

  // ✅ NEU: Prüft ob Position auf bestehender Straße liegt (5x1 Breite)
  isPositionOnStreet(x, z) {
    for (const street of this.streets) {
      const dx = street.to.x - street.from.x;
      const dz = street.to.z - street.from.z;
      const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

      for (let step = 0; step <= totalSteps; step++) {
        const progress = step / totalSteps;
        const streetX = Math.round(street.from.x + dx * progress);
        const streetZ = Math.round(street.from.z + dz * progress);

        // ✅ 5x1 BREITE: ox -2 bis 2
        for (let ox = -2; ox <= 2; ox++) {
          if (x === streetX + ox && z === streetZ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isPositionInAnyBuilding(x, z, buffer = 0) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        const width = building.width || 16;
        const depth = building.depth || 16;
        // Check with buffer: strict > and < to allow buffer edge?
        // Let's say buffer=1. Building at 10. Range 10..26.
        // check: x >= 10-1 (9) && x < 26+1 (27).
        // If x=9, it returns true (COLLISION).
        // If x=8, it returns false (SAFE).
        // This effectively keeps a 1-block clear zone around the building.
        if (x >= building.x - buffer && x < building.x + width + buffer &&
          z >= building.z - buffer && z < building.z + depth + buffer) {
          return true;
        }
      }
    }
    return false;
  }

  getDoorDirection(doorX, doorZ, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;

    // Detect which wall the door is on and point OUTWARDS
    if (doorZ === building.z) return { stepX: 0, stepZ: -1 }; // North face, go North (-Z)
    if (doorZ === building.z + depth - 1) return { stepX: 0, stepZ: 1 }; // South face, go South (+Z)
    if (doorX === building.x) return { stepX: -1, stepZ: 0 }; // West face, go West (-X)
    if (doorX === building.x + width - 1) return { stepX: 1, stepZ: 0 }; // East face, go East (+X)

    // Default fallback (should not happen if door is on edge)
    return { stepX: 0, stepZ: 1 };
  }

  async buildEntrySegment(buildY, building) {
    const doorX = building.x + (building.doorPos?.x || 8);
    const doorZ = building.z + (building.doorPos?.z || 0);
    const dir = this.getDoorDirection(doorX, doorZ, building);

    console.log(`🛣️ Entry Segment: Building ${building.name} at ${doorX},${doorZ} dir ${dir.stepX},${dir.stepZ}`);

    // Start 1 block away from door to avoid overwriting the door itself or threshold
    const startX = doorX + dir.stepX;
    const startZ = doorZ + dir.stepZ;

    // End 8 blocks away (inclusive of start, so +7 more steps? OR 8 blocks length)
    // "8 Blöcke Straße geradeaus" -> Length 8.
    const length = 8;
    const endX = startX + (dir.stepX * (length - 1));
    const endZ = startZ + (dir.stepZ * (length - 1));

    console.log(`🛣️ Building Entry Segment from ${startX},${startZ} to ${endX},${endZ}`);

    // Build the segment carefully with SURGICAL precision to avoid house damage
    const steps = length;
    for (let i = 0; i < steps; i++) {
      const cx = startX + (dir.stepX * i);
      const cz = startZ + (dir.stepZ * i);

      // Surgical Clear: Only clear the slice at the current step
      // Width = 9 (Center +/- 4) to match foundation width request
      // Depth = 1 (Current step only)
      // If moving along X (stepX != 0), extend along Z.
      // If moving along Z (stepZ != 0), extend along X.

      let minX, maxX, minZ, maxZ;

      if (dir.stepX !== 0) { // Moving East/West
        minX = cx; maxX = cx; // 1 block deep in movement dir
        minZ = cz - 4; maxZ = cz + 4; // 9 blocks wide
      } else { // Moving North/South
        minX = cx - 4; maxX = cx + 4; // 9 blocks wide
        minZ = cz; maxZ = cz; // 1 block deep in movement dir
      }

      // Clear Air
      await this.commandHelper.fill(
        minX, buildY + 1, minZ,
        maxX, buildY + 64, maxZ,
        'air'
      );

      // Foundation (Deepslate Tiles) to Y=44 (Width 9)
      await this.commandHelper.fill(
        minX, 44, minZ,
        maxX, buildY - 1, maxZ,
        'deepslate_tiles'
      );

      // Street Surface (Birch Planks) width 5 (Center +/- 2)
      let sMinX, sMaxX, sMinZ, sMaxZ;
      if (dir.stepX !== 0) {
        sMinX = cx; sMaxX = cx;
        sMinZ = cz - 2; sMaxZ = cz + 2;
      } else {
        sMinX = cx - 2; sMaxX = cx + 2;
        sMinZ = cz; sMaxZ = cz;
      }

      await this.commandHelper.fill(
        sMinX, buildY, sMinZ,
        sMaxX, buildY, sMaxZ,
        'birch_planks'
      );
    }

    // Add lanterns? Maybe at end?
    // Let's stick to base requirements. "8 Blöcke Straße". Laternen come with logic.
    // But we should probably add one at the end or begin.
    // existing buildStreetLanterns might work if called on this segment, but we want to avoid complex logic here.

    return { x: endX, z: endZ };
  }

  isPositionInSpecificBuilding(x, z, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;
    return (x >= building.x && x < building.x + width &&
      z >= building.z && z < building.z + depth);
  }

  isPathFree(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // ✅ 5x1 Prüfung
      for (let ox = -2; ox <= 2; ox++) {
        if (this.isPositionInAnyBuilding(currentX + ox, currentZ, 1)) {
          return false;
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

  async buildStreetToVillageCentrum(buildY, building, village) {
    console.log(`🛣️ ERSTES GEBÄUDE: Baue Straße zu Village-Zentrum`);

    let fromEdge = await this.buildEntrySegment(buildY, building);
    if (!fromEdge) {
      console.log('⚠️ Entry Segment Failed');
      return;
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

    let fromEdge = await this.buildEntrySegment(buildY, fromBuilding);
    if (!fromEdge) {
      console.log('⚠️ Entry Segment Failed');
      return;
    }

    // Target is another building. Should we also build an entry segment FOR the target?
    // "Straßenbaulogik Häuser an diesem Punkt mit dem Netz verbindet"
    // Ideally, YES. We should pathfind to the entry-point of the target building, not its door directly.

    let toEntry = await this.buildEntrySegment(buildY, toBuilding);
    // pathfind from fromEdge (end of start segment) to toEntry (end of target segment)

    const toStartX = toEntry.x;
    const toStartZ = toEntry.z;

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
    const interval = 10, offset = 1; // Updated to 10 as per previous task
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
      const progress = totalSteps > 0 ? step / totalSteps : 0;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // ✅ Erweiterte Räumung: y+64, x/z +/- 4 (Freiraum)
      await this.commandHelper.fill(
        currentX - 4, buildY + 1, currentZ - 4,
        currentX + 4, buildY + 64, currentZ + 4,
        'air'
      );
    }
  }

  async buildPath(buildY, x1, z1, x2, z2) {
    console.log(`🧱 Baue Straße ${x1},${z1} -> ${x2},${z2} (5x1)`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let step = 0; step <= totalSteps; step++) {
      const progress = totalSteps > 0 ? step / totalSteps : 0;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // We need to determine orientation for correct width clearing vs length
      // For general path (diagonal possible), clearAbove handles 9x9 box.
      // But for foundation and street, we want clean lines.
      // Let's stick to the box approach for general paths as they curve.

      // Clear Air (Standard clearAbove uses +/- 4 box, which matches our width 9 requirement)
      // Re-implement clear here to ensure deep clear?
      // actually clearAbove handles air.
      // foundation:
      await this.commandHelper.fill(
        currentX - 4, 44, currentZ - 4,
        currentX + 4, buildY - 1, currentZ + 4,
        'deepslate_tiles'
      );

      // Street Surface (Birch Planks) +/- 2
      await this.commandHelper.fill(
        currentX - 2, buildY, currentZ - 2,
        currentX + 2, buildY, currentZ + 2,
        'birch_planks'
      );
    }

    console.log(`✅ Straße fertig`);
  }

  async buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`💡 Baue Straßenlaternen (Abstand: 6 Blöcke)`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 6;
    const isHorizontal = Math.abs(dx) >= Math.abs(dz);

    // ✅ LATERNEN 3 BLÖCKE ENTFERNT VON STRASSENMITTE (für 5x1 Straße)
    const leftOff = isHorizontal ? [0, 3] : [-3, 0];
    const rightOff = isHorizontal ? [0, -3] : [3, 0];

    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = totalSteps > 0 ? step / totalSteps : 0;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      await this.placeLantern(buildY, currentX + leftOff[0], currentZ + leftOff[1]);
      await this.placeLantern(buildY, currentX + rightOff[0], currentZ + rightOff[1]);
    }
  }

  async placeLantern(buildY, x, z) {
    // ✅ Unterer Block (Pfosten) auf buildY
    this.bot.chat(`/setblock ${x} ${buildY + 1} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 20));

    // ✅ LATERNE Y+1 HÖHER: buildY + 2 statt buildY + 1
    this.bot.chat(`/setblock ${x} ${buildY + 2} ${z} lantern`);
    await new Promise(r => setTimeout(r, 20));
  }
}

module.exports = StreetBuilder;
