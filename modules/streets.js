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

  // ❌ ABSOLUTER BLOCK: Niemals Gebäude-Innenraum betreten
  isPositionInAnyBuilding(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings) {
        const width = building.width || 16;
        const depth = building.depth || 16;
        // KOMPLETTES Gebäude-Rechteck (inkl. Fundament + Wände)
        if (x >= building.x && x < building.x + width &&
            z >= building.z && z < building.z + depth) {
          return true;
        }
      }
    }
    return false;
  }

  // Berechnet Fundament-Ende in TÜR-RICHTUNG (nicht gegenüberliegend)
  calculateFoundationExit(doorX, doorZ, building) {
    const width = building.width || 16;
    const depth = building.depth || 16;
    
    // Von Türposition aus: gleiche Richtung zum nächsten Fundament-Rand
    let exitX = doorX;
    let exitZ = doorZ;
    
    // Tür-Richtung bestimmen (meist Z=0 = Vorderseite)
    if (doorZ === building.z) {
      // Tür an Vorderseite -> hinten raus
      exitZ = building.z + depth - 1;
    } else if (doorZ === building.z + depth - 1) {
      // Tür an Rückseite -> vorne raus  
      exitZ = building.z;
    } else if (doorX === building.x) {
      // Tür links -> rechts raus
      exitX = building.x + width - 1;
    } else if (doorX === building.x + width - 1) {
      // Tür rechts -> links raus
      exitX = building.x;
    } else {
      // Standard: Vorderseite (Z-Richtung)
      exitZ = building.z + depth - 1;
    }
    
    console.log(`StreetBuilder Tür ${doorX},${doorZ} -> Fundament-Ende ${exitX},${exitZ}`);
    return { x: exitX, z: exitZ };
  }

  // ❌ STRIKTER Check: Pfad darf KEIN Gebäude berühren
  isPathFree(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      
      // 5x3 Straße-Bereich: KEIN Gebäude erlaubt!
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this.isPositionInAnyBuilding(currentX + ox, currentZ + oz)) {
            console.log(`❌ StreetBuilder GEBÄUDE bei ${currentX + ox}, ${currentZ + oz} - Pfad blockiert!`);
            return false;
          }
        }
      }
    }
    return true;
  }

  findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 12) {
    console.log('StreetBuilder Suche sicheren Umweg (KEINE Gebäude!)...');
    const offsets = [];
    for (let dist = 1; dist <= maxAttempts; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist <= 3) {
        offsets.push([dist, dist], [dist, -dist], [-dist, dist], [-dist, -dist]);
      }
    }

    for (const [ox, oz] of offsets) {
      const testX1 = x1 + ox;
      const testZ1 = z1 + oz;
      const testX2 = x2 + ox;
      const testZ2 = z2 + oz;
      if (this.isPathFree(buildY, testX1, testZ1, testX2, testZ2)) {
        console.log(`✅ StreetBuilder Sicherer Pfad offset ${ox},${oz}`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    return null;
  }

  // ✅ GEFIXT: Gerade vom Türblock zum Fundament-Ende (TÜR-RICHTUNG)
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    // START: Direkt vor fromBuilding-Tür (1 Block Abstand)
    const doorX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    const doorZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    const fromStartX = doorX;
    const fromStartZ = doorZ - 1; // 1 Block vor Tür

    // Phase 1: GERADLINIG zur Tür-Richtung Fundament-Ende
    const foundationExit = this.calculateFoundationExit(doorX, doorZ, fromBuilding);
    const path1 = {
      x1: fromStartX, z1: fromStartZ,
      x2: foundationExit.x, z2: foundationExit.z
    };
    
    // ❌ Phase 1: AUCH Check auf Gebäude (extra sicher!)
    if (this.isPathFree(buildY, path1.x1, path1.z1, path1.x2, path1.z2)) {
      console.log(`✅ Phase1: Gerade Fundament-Straße ${path1.x1},${path1.z1} -> ${path1.x2},${path1.z2}`);
      await this.clearAbove(buildY, path1.x1, path1.z1, path1.x2, path1.z2);
      await this.buildPath(buildY, path1.x1, path1.z1, path1.x2, path1.z2);
    } else {
      console.log(`❌ Phase1 blockiert durch Gebäude - überspringe!`);
      return;
    }

    // Phase 2: Von Fundament-Ende zu toBuilding 1vorTür (Netzwerk)
    const toDoorX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    const toDoorZ = toBuilding.z + (toBuilding.doorPos?.z || 0);
    const finalToX = toDoorX;
    const finalToZ = toDoorZ - 1;
    
    let path2 = { x1: path1.x2, z1: path1.z2, x2: finalToX, z2: finalToZ };
    
    if (!this.isPathFree(buildY, path2.x1, path2.z1, path2.x2, path2.z2)) {
      path2 = this.findValidPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    }
    
    if (!path2) {
      console.log('❌ StreetBuilder KEIN sicherer Pfad für Phase2!');
      return;
    }

    console.log(`✅ Phase2: Netzwerk ${path2.x1},${path2.z1} -> ${path2.x2},${path2.z2}`);
    await this.clearAbove(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildPath(buildY, path2.x1, path2.z1, path2.x2, path2.z2);
    await this.buildStreetLanterns(buildY, path2.x1, path2.z1, path2.x2, path2.z2);

    this.streets.push({
      from: { name: `${fromBuilding.name}-fundamentExit`, x: path1.x2, z: path1.z2 },
      to: { name: `${toBuilding.name}-1vorTür`, x: path2.x2, z: path2.z2 },
      buildY,
      timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  // buildStreet unverändert
  async buildStreet(buildY, target) {
    // ... (identisch wie vorher)
  }

  // ... (buildLanternPosts, clearAbove, buildPath, buildStreetLanterns, placeLantern identisch)
  async buildLanternPosts(buildY, building) {
    // identisch
  }

  async clearAbove(buildY, x1, z1, x2, z2) {
    // identisch
  }

  async buildPath(buildY, x1, z1, x2, z2) {
    // identisch
  }

  async buildStreetLanterns(buildY, x1, z1, x2, z2) {
    // identisch
  }

  async placeLantern(buildY, x, z) {
    // identisch
  }
}

module.exports = StreetBuilder;
