const fs = require('fs');
const path = require('path');

class StreetBuilder {
  constructor(bot) {
    this.bot = bot;
    this.streetsFile = path.join(process.cwd(), 'data', 'streets.json');
    this.villagesFile = path.join(process.cwd(), 'data', 'villages.json');
    this.streets = this._loadStreets();
    this.villages = this._loadVillages();
    this._ensureDataDir();
  }

  _ensureDataDir() {
    const dataDir = path.dirname(this.streetsFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  _loadStreets() {
    try {
      if (fs.existsSync(this.streetsFile)) {
        const content = fs.readFileSync(this.streetsFile, 'utf8');
        if (content.trim() === '') return [];
        return JSON.parse(content);
      }
    } catch (e) {
      console.log('[StreetBuilder] ⚠️ Load streets Fehler:', e.message);
    }
    return [];
  }

  _loadVillages() {
    try {
      if (fs.existsSync(this.villagesFile)) {
        const content = fs.readFileSync(this.villagesFile, 'utf8');
        if (content.trim() === '') return [];
        return JSON.parse(content);
      }
    } catch (e) {
      console.log('[StreetBuilder] ⚠️ Load villages Fehler:', e.message);
    }
    return [];
  }

  saveStreets() {
    try {
      fs.writeFileSync(this.streetsFile, JSON.stringify(this.streets, null, 2), 'utf8');
    } catch (e) {
      console.log('[StreetBuilder] ❌ Save streets Fehler:', e.message);
    }
  }

  // Prüft ob Pfad Gebäude blockiert
  _isPathBlocked(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      const offsets = [[-1,0],[0,-1],[0,0],[0,1],[1,0]];
      for (const [ox, oz] of offsets) {
        const checkX = currentX + ox;
        const checkZ = currentZ + oz;
        
        // Prüfe alle Gebäude aus villages.json
        for (const village of this.villages) {
          for (const building of village.buildings || []) {
            if (checkX >= building.x && checkX < building.x + (building.width || 16) &&
                checkZ >= building.z && checkZ < building.z + (building.depth || 16)) {
              return true; // Blockiert!
            }
          }
        }
      }
    }
    return false;
  }

  // Finde Umgehungsweg um Gebäude
  _findDetour(buildY, x1, z1, x2, z2, maxAttempts = 10) {
    const directions = [[3,0],[-3,0],[0,3],[0,-3]]; // Rechts, links, vor, zurück
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (const [dxOff, dzOff] of directions) {
        const testX1 = x1 + dxOff;
        const testZ1 = z1 + dzOff;
        const testX2 = x2 + dxOff;
        const testZ2 = z2 + dzOff;
        
        if (!this._isPathBlocked(buildY, testX1, testZ1, testX2, testZ2)) {
          console.log(`[StreetBuilder] 🔀 Umweg gefunden: offset (${dxOff},${dzOff})`);
          return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
        }
      }
    }
    return null; // Kein Umweg gefunden
  }

  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    let fromX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    let fromZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    let toX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    let toZ = toBuilding.z + (toBuilding.doorPos?.z || 0);

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY} von (${fromX},${fromZ}) nach (${toX},${toZ})`);

    // Prüfe direkten Weg, sonst Umweg
    if (this._isPathBlocked(buildY, fromX, fromZ, toX, toZ)) {
      const detour = this._findDetour(buildY, fromX, fromZ, toX, toZ);
      if (detour) {
        fromX = detour.x1; fromZ = detour.z1;
        toX = detour.x2; toZ = detour.z2;
      } else {
        console.log('[StreetBuilder] ❌ Kein gangbarer Weg gefunden!');
        return;
      }
    }

    await this._clearAbove(buildY, fromX, fromZ, toX, toZ);
    await this._buildPath(buildY, fromX, fromZ, toX, toZ);
    await this._buildStreetLanterns(buildY, fromX, fromZ, toX, toZ); // Neue Straßenlaternen

    this.streets.push({
      from: { name: fromBuilding.name || 'unknown', x: fromX, z: fromZ },
      to: { name: toBuilding.name || 'unknown', x: toX, z: toZ },
      buildY: buildY, timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  async _clearAbove(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 🧹 Freiräumen oberhalb y=${buildY} bis y=${buildY+4}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      const offsets = [[-1,0],[0,-1],[0,0],[0,1],[1,0]];
      for (const [ox, oz] of offsets) {
        const blockX = currentX + ox;
        const blockZ = currentZ + oz;
        for (let clearY = buildY + 1; clearY <= buildY + 5; clearY++) {
          this.bot.chat(`/setblock ${blockX} ${clearY} ${blockZ} air`);
          await new Promise(r => setTimeout(r, 5));
        }
      }
    }
  }

  async _buildPath(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      const offsets = [[-1,0],[0,-1],[0,0],[0,1],[1,0]];
      for (const [ox, oz] of offsets) {
        this.bot.chat(`/setblock ${currentX+ox} ${buildY} ${currentZ+oz} stone_bricks`);
        await new Promise(r => setTimeout(r, 15));
      }
    }
    console.log('[StreetBuilder] ✅ Straße fertig y=' + buildY);
  }

  // NEU: Straßenlaternen links/rechts alle 6 Blöcke
  async _buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 💡 Straßenlaternen y=${buildY}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 6;

    // Richtung der Straße bestimmen für links/rechts
    const dirX = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : -1) : 0;
    const dirZ = Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? 1 : -1) : 0;
    
    // Perpendicular offsets für links/rechts (1 Block Abstand)
    const leftOffset = dirX ? [0, dirZ ? dirZ : 1] : [dirZ ? -dirZ : -1, 0];
    const rightOffset = dirX ? [0, dirZ ? -dirZ : -1] : [dirZ ? dirZ : 1, 0];

    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // Links
      const leftX = currentX + leftOffset[0];
      const leftZ = currentZ + leftOffset[1];
      await this._placeStreetLantern(buildY, leftX, leftZ);

      // Rechts  
      const rightX = currentX + rightOffset[0];
      const rightZ = currentZ + rightOffset[1];
      await this._placeStreetLantern(buildY, rightX, rightZ);
    }
  }

  async _placeStreetLantern(buildY, x, z) {
    this.bot.chat(`/setblock ${x} ${buildY} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 50));
    this.bot.chat(`/setblock ${x} ${buildY+1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 50));
  }

  async buildLanternPosts(buildY, building) {
    // Gebäude-Laternen (alt)
    console.log(`[StreetBuilder] 💡 ${building.name} Gebäude-Laternen y=${buildY}`);
    const width = building.width || 16;
    const depth = building.depth || 16;
    const interval = 6, offset = 1;
    const minX = building.x - offset, maxX = building.x + width + offset;
    const minZ = building.z - offset, maxZ = building.z + depth + offset;

    const positions = [];
    for (let x = minX; x <= maxX; x += interval) {
      positions.push({x: x, z: minZ}, {x: x, z: maxZ});
    }
    for (let z = minZ; z <= maxZ; z += interval) {
      positions.push({x: minX, z: z}, {x: maxX, z: z});
    }

    const seen = new Set();
    for (const pos of positions) {
      const key = `${pos.x},${pos.z}`;
      if (!seen.has(key)) {
        await this._placeStreetLantern(buildY, pos.x, pos.z);
        seen.add(key);
      }
    }
  }
}

module.exports = StreetBuilder;
