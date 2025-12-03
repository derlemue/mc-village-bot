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

  // ❌ ABSOLUTER BLOCK: Niemals Gebäudefläche betreten
  isPositionInAnyBuilding(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        const width = building.width || 16;
        const depth = building.depth || 16;
        // KOMPLETTES Gebäude-Rechteck (inkl. Wände + Innenraum)
        if (x >= building.x && x < building.x + width &&
            z >= building.z && z < building.z + depth) {
          return true;
        }
      }
    }
    return false;
  }

  // Berechnet Richtung von Tür zum nächsten sicheren Punkt (außerhalb Gebäudefläche)
  getDoorDirection(doorX, doorZ, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;
    
    // Von Türposition die Richtung zum nächsten Rand außerhalb
    if (doorZ === building.z) {
      return { stepX: 0, stepZ: 1 }; // Vorderseite -> nach hinten
    } else if (doorX === building.x) {
      return { stepX: 1, stepZ: 0 }; // Linke Seite -> nach rechts
    } else if (doorX === building.x + width - 1) {
      return { stepX: -1, stepZ: 0 }; // Rechte Seite -> nach links
    } else {
      return { stepX: 0, stepZ: 1 }; // Standard: gerade weg von Tür
    }
  }

  // Phase 1: Gerade Straße bis ERSTES Gebäude (STOPP vor Gebäudefläche!)
  async buildStreetToBuildingEdge(buildY, startX, startZ, building) {
    const direction = this.getDoorDirection(startX, startZ, building);
    const pathPoints = [];
    
    // Von Startpunkt gerade laufen bis Gebäudefläche erreicht
    let currentX = startX;
    let currentZ = startZ;
    
    console.log(`🔍 Phase1: Suche sicheren Pfad von ${currentX},${currentZ}`);
    
    // Max 32 Blöcke prüfen (sicherer Abbruch)
    for (let i = 0; i < 32; i++) {
      // Prüfe 5x3 Straßenbereich
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
        console.log(`🛑 Phase1 STOPP bei Gebäudefläche ${currentX},${currentZ}`);
        break;
      }
      
      pathPoints.push({ x: currentX, z: currentZ });
      currentX += direction.stepX;
      currentZ += direction.stepZ;
    }
    
    if (pathPoints.length === 0) {
      console.log('❌ Kein sicherer Startpunkt gefunden!');
      return null;
    }
    
    // Letzter sicherer Punkt
    const edgeX = pathPoints[pathPoints.length - 1].x;
    const edgeZ = pathPoints[pathPoints.length - 1].z;
    
    console.log(`✅ Phase1: Straße bis Rand ${edgeX},${edgeZ}`);
    
    // Baue Phase 1 Straße
    await this.clearAbove(buildY, startX, startZ, edgeX, edgeZ);
    await this.buildPath(buildY, startX, startZ, edgeX, edgeZ);
    
    return { x: edgeX, z: edgeZ };
  }

  // Phase 2: Vernetzung zwischen Rändern (keine Gebäude!)
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

  findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 20) {
    console.log('🔍 Phase2: Suche Umweg...');
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
        console.log(`✅ Phase2 Umweg: offset ${ox},${oz}`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    return null;
  }

  // ✅ GEFIXT: Niemals durch Gebäudefläche!
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    console.log(`🛣️ StreetBuilder: ${fromBuilding.name} -> ${toBuilding.name}`);
    
    // Phase 1 START: 1 Block vor fromBuilding-Tür
    const doorX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    const doorZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1;
    
    console.log(`🚪 Start: 1 Block vor Tür ${fromStartX},${fromStartZ}`);

    // Phase 1: Bis ERSTES Gebäude (Randpunkt finden)
    const fromEdge = await this.buildStreetToBuildingEdge(buildY, fromStartX, fromStartZ, fromBuilding);
    if (!fromEdge) {
      console.log('❌ Phase1 fehlgeschlagen!');
      return;
    }

    // Phase 2 START: 1 Block vor toBuilding-Tür
    const toDoorX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    const toDoorZ = toBuilding.z + (toBuilding.doorPos?.z || 0);
    const toStartX = toDoorX;
    const toStartZ = toDoorZ - 1;
    
    console.log(`🚪 Ziel: 1 Block vor Tür ${toStartX},${toStartZ}`);

    // Phase 2: Vernetzung zwischen Rändern
    let path2 = { x1: fromEdge.x, z1: fromEdge.z, x2: toStartX, z2: toStartZ };
    
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }
    
    if (path2) {
      console.log(`✅ Phase2: ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2}`);
      await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
      await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
      await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    } else {
      console.log('⚠️ Phase2 übersprungen (kein Pfad)');
    }

    // Speichern
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
    // Flexibler Build-Befehl (unverändert)
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
          await new Promise(r => setTimeout(r, 20));
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
