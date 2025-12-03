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

  // Prüft ob Position im Gebäude-Innenraum liegt (NICHT Fundament-Rand)
  isPositionInBuildingInterior(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        const width = building.width || 16;
        const depth = building.depth || 16;
        // Nur INNENRAUM (1 Block Einsatz vom Rand)
        if (x > building.x && x < building.x + width - 1 &&
            z > building.z && z < building.z + depth - 1) {
          return true;
        }
      }
    }
    return false;
  }

  // Berechnet HORIZONTALE/VERTIKALE Richtung zur Tür
  getDoorDirection(doorX, doorZ, building) {
    const centerX = building.x + (building.width || 16) / 2;
    const centerZ = building.z + (building.depth || 16) / 2;
    
    const dx = Math.abs(doorX - centerX);
    const dz = Math.abs(doorZ - centerZ);
    
    if (dx > dz) return 'horizontal'; // X-Richtung (links/rechts zur Tür)
    return 'vertical'; // Z-Richtung (vorne/hinten zur Tür)
  }

  // KÜRZESTER Weg: 1 Block vor Tür -> Fundament-Ende (horizontal/vertikal)
  calculateFoundationPath(fromX, fromZ, building) {
    const doorDir = this.getDoorDirection(fromX, fromZ, building);
    const width = building.width || 16;
    const depth = building.depth || 16;
    
    let foundationEndX, foundationEndZ;
    
    if (doorDir === 'horizontal') {
      // Horizontal zur Tür: gleiches Z, zum Gegenseite-Fundament-Ende
      foundationEndX = fromX < building.x + width / 2 ? building.x + width - 1 : building.x;
      foundationEndZ = fromZ; // Gleiches Z-Level
    } else {
      // Vertikal zur Tür: gleiches X, zum Gegenseite-Fundament-Ende
      foundationEndX = fromX;
      foundationEndZ = fromZ < building.z + depth / 2 ? building.z + depth - 1 : building.z;
    }
    
    console.log(`StreetBuilder Tür-Richtung: ${doorDir}, Fundament-Ende: ${foundationEndX},${foundationEndZ}`);
    return { x: foundationEndX, z: foundationEndZ };
  }

  // Prüft ob kompletter Pfad frei von Gebäuden ist (Außenbereich)
  isPathFree(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInBuildingInterior(currentX + ox, currentZ + oz)) {
            console.log(`StreetBuilder Gebäude-Innenraum bei ${currentX + ox}, ${currentZ + oz}`);
            return false;
          }
        }
      }
    }
    return true;
  }

  findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 12) {
    console.log('StreetBuilder Suche freien Pfad (Außenbereich)...');
    const offsets = [];
    for (let dist = 1; dist <= maxAttempts; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist <= 2) {
        offsets.push([dist, dist], [dist, -dist], [-dist, dist], [-dist, -dist]);
      }
    }

    for (const [ox, oz] of offsets) {
      const testX1 = x1 + ox;
      const testZ1 = z1 + oz;
      const testX2 = x2 + ox;
      const testZ2 = z2 + oz;
      if (this.isPathFree(buildY, testX1, testZ1, testX2, testZ2)) {
        console.log(`StreetBuilder Freier Pfad gefunden offset ${ox},${oz}`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    return null;
  }

  // ✅ GEFIXT: Horizontal/Vertikal + Fundament-Ende
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    // START: 1 Block vor fromBuilding-Tür
    const doorX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    const doorZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1; // 1 Block vor Tür

    // Phase 1: HORIZONTAL/VERTIKAL zum Fundament-Ende (GERADE!)
    const foundationEnd = this.calculateFoundationPath(fromStartX, fromStartZ, fromBuilding);
    const path1 = {
      x1: fromStartX, z1: fromStartZ,
      x2: foundationEnd.x, z2: foundationEnd.z
    };
    
    console.log(`Phase1: Fundament-Straße ${path1.x1},${path1.z1} -> ${path1.x2},${path1.z2} (horizontal/vertikal)`);
    
    // Phase 1: DIREKT bauen (keine Prüfung, eigenes Fundament)
    await this.clearAbove(buildY, path1.x1, path1.z1, path1.x2, path1.z2);
    await this.buildPath(buildY, path1.x1, path1.z1, path1.x2, path1.z2);

    // Phase 2: Von fromBuilding-Fundament-Ende zu toBuilding 1vorTür (DIAGONAL OK)
    const toDoorX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    const toDoorZ = toBuilding.z + (toBuilding.doorPos?.z || 0);
    const finalToX = toDoorX;
    const finalToZ = toDoorZ - 1; // 1 Block vor toBuilding-Tür
    
    let path2 = { x1: path1.x2, z1: path1.z2, x2: finalToX, z2: finalToZ };
    
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }
    
    if (!path2) {
      console.log('StreetBuilder KEIN freier Pfad für Phase2 gefunden!');
      return;
    }

    console.log(`Phase2: Vernetzung ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2} (diagonal OK)`);
    await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);

    this.streets.push({
      from: { name: `${fromBuilding.name}-fundamentEnde`, x: path1.x2, z: path1.z2 },
      to: { name: `${toBuilding.name}-1vorTür`, x: path2.x2, z: path2.z2 },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  // buildStreet bleibt unverändert (Koordinaten/Flexibel)
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

  // ... (buildLanternPosts, clearAbove, buildPath, buildStreetLanterns, placeLantern bleiben unverändert)
  async buildLanternPosts(buildY, building) {
    console.log(`StreetBuilder ${building.name} Gebäude-Laternen y${buildY}`);
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
    console.log(`StreetBuilder Freiräumen oberhalb y${buildY}`);
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
            await new Promise(r => setTimeout(r, 5));
          }
        }
      }
    }
  }

  async buildPath(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          this.bot.chat(`/setblock ${currentX + ox} ${buildY} ${currentZ + oz} stone_bricks`);
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }
    console.log(`StreetBuilder Straße fertig y${buildY}`);
  }

  async buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log('StreetBuilder Straßenlaternen links/rechts');
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
    await new Promise(r => setTimeout(r, 50));
    this.bot.chat(`/setblock ${x} ${buildY + 1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 50));
  }
}

module.exports = StreetBuilder;
