const fs = require('fs');
const path = require('path');

class StreetBuilder {
  constructor(bot) {
    this.bot = bot;
    this.streetsFile = path.join(process.cwd(), 'data', 'streets.json');
    this.villagesFile = path.join(process.cwd(), 'data', 'villages.json');
    this.streets = this.loadStreets();
    this.villages = this.loadVillages();
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

  loadVillages() {
    try {
      if (fs.existsSync(this.villagesFile)) {
        const content = fs.readFileSync(this.villagesFile, 'utf8');
        if (content.trim()) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.log('StreetBuilder Load villages Fehler:', e.message);
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

  // ✅ Phase 1: EIGENES Fundament - IMMER erlaubt
  isPositionInForeignBuilding(x, z, ownBuilding) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        // Überspringe eigenes Gebäude
        if (building === ownBuilding) continue;
        
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

  // Phase 2: ALLE anderen Gebäude blockieren
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

  // Berechnet Fundament-Ende in TÜR-RICHTUNG
  calculateFoundationExit(doorX, doorZ, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;
    
    let exitX = doorX;
    let exitZ = doorZ;
    
    // Von Tür zum nächsten Rand in TÜR-RICHTUNG
    if (doorZ <= building.z + 1) {
      exitZ = building.z + depth - 1; // Vorne -> Hinten
    } else if (doorX <= building.x + 1) {
      exitX = building.x + width - 1; // Links -> Rechts
    } else if (doorX >= building.x + width - 2) {
      exitX = building.x; // Rechts -> Links
    } else {
      exitZ = building.z + depth - 1; // Standard: Hinten raus
    }
    
    return { x: exitX, z: exitZ };
  }

  // Phase 1: Nur EIGENES Fundament Check
  isFoundationPathFree(x1, z1, x2, z2, ownBuilding) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInForeignBuilding(currentX + ox, currentZ + oz, ownBuilding)) {
            console.log(`❌ Phase1: Fremdes Gebäude bei ${currentX + ox}, ${currentZ + oz}`);
            return false;
          }
        }
      }
    }
    return true;
  }

  // Phase 2: KEINE Gebäude erlaubt
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
            console.log(`❌ Phase2: Gebäude bei ${currentX + ox}, ${currentZ + oz}`);
            return false;
          }
        }
      }
    }
    return true;
  }

  findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 15) {
    console.log('🔍 StreetBuilder Suche Umweg...');
    const offsets = [];
    for (let dist = 1; dist <= maxAttempts; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist <= 4) {
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
    return null;
  }

  // ✅ GEFIXT: Straßen werden IMMER gebaut
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    console.log(`🛣️ StreetBuilder: ${fromBuilding.name} -> ${toBuilding.name}`);
    
    // Phase 1 START: 1 Block vor fromBuilding-Tür
    const doorX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    const doorZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1;

    // Phase 1: Gerade zum Fundament-Ende (EIGENES Fundament OK)
    const foundationExit = this.calculateFoundationExit(doorX, doorZ, fromBuilding);
    const path1 = {
      x1: fromStartX, z1: fromStartZ,
      x2: foundationExit.x, z2: foundationExit.z
    };
    
    console.log(`Phase1: ${path1.x1},${path1.z1} -> ${path1.x2},${path1.z2}`);
    
    // ✅ Phase 1 IMMER bauen (eigenes Fundament erlaubt)
    if (this.isFoundationPathFree(path1.x1, path1.z1, path1.x2, path1.z2, fromBuilding)) {
      await this.clearAbove(buildY, path1.x1, path1.z1, path1.x2, path1.z2);
      await this.buildPath(buildY, path1.x1, path1.z1, path1.x2, path1.z2);
      console.log('✅ Phase1 gebaut');
    } else {
      console.log('⚠️ Phase1 übersprungen (fremdes Gebäude)');
    }

    // Phase 2: Von Fundament-Ende zu toBuilding 1vorTür
    const toDoorX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    const toDoorZ = toBuilding.z + (toBuilding.doorPos?.z || 0);
    const finalToX = toDoorX;
    const finalToZ = toDoorZ - 1;
    
    let path2 = { x1: path1.x2, z1: path1.z2, x2: finalToX, z2: finalToZ };
    
    console.log(`Phase2 Start: ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2}`);
    
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }
    
    if (path2) {
      console.log('✅ Phase2 gebaut');
      await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
      await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
      await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    } else {
      console.log('⚠️ Phase2 übersprungen (kein Pfad)');
    }

    // ✅ IMMER speichern (auch wenn Phase2 fehlschlägt)
    this.streets.push({
      from: { name: `${fromBuilding.name}-exit`, x: path1.x2, z: path1.z2 },
      to: { name: `${toBuilding.name}-door`, x: finalToX, z: finalToZ },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
    console.log('💾 Straße in streets.json gespeichert');
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
    
    if (!path) {
      console.log('StreetBuilder KEIN freier Pfad gefunden!');
      return;
    }

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
    console.log(`🗼 StreetBuilder ${building.name} Gebäude-Laternen y${buildY}`);
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
        console.log(`🗼 Gebäude-Laterne bei ${pos.x},${buildY},${pos.z}`);
        await this.placeLantern(buildY, pos.x, pos.z);
        seen.add(key);
      }
    }
  }

  async clearAbove(buildY, x1, z1, x2, z2) {
    console.log(`🧹 StreetBuilder Freiräumen oberhalb y${buildY}`);
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
    console.log(`🛣️ StreetBuilder Baue Straße y${buildY} von ${x1},${z1} nach ${x2},${z2}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          const targetX = currentX + ox;
          const targetZ = currentZ + oz;
          console.log(`🧱 Setze Straßenblock ${targetX},${buildY},${targetZ} stone_bricks`);
          this.bot.chat(`/setblock ${targetX} ${buildY} ${targetZ} stone_bricks`);
          await new Promise(r => setTimeout(r, 20)); // Erhöhte Delay
        }
      }
    }
    console.log(`✅ StreetBuilder Straße fertig y${buildY}`);
  }

  async buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`💡 StreetBuilder Straßenlaternen links/rechts`);
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
      
      console.log(`💡 Linke Laterne: ${currentX + leftOff[0]},${buildY},${currentZ + leftOff[1]}`);
      await this.placeLantern(buildY, currentX + leftOff[0], currentZ + leftOff[1]);
      
      console.log(`💡 Rechte Laterne: ${currentX + rightOff[0]},${buildY},${currentZ + rightOff[1]}`);
      await this.placeLantern(buildY, currentX + rightOff[0], currentZ + rightOff[1]);
    }
  }

  async placeLantern(buildY, x, z) {
    console.log(`💡 Setze Laterne bei ${x},${buildY},${z}`);
    this.bot.chat(`/setblock ${x} ${buildY} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 100));
    this.bot.chat(`/setblock ${x} ${buildY + 1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 100));
    console.log(`✅ Laterne platziert ${x},${buildY + 1},${z}`);
  }
}

module.exports = StreetBuilder;
