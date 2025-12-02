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

  // Prüft ob Position in Gebäude liegt (mit Margin)
  _isPositionInBuilding(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings || []) {
        const margin = 2; // Sicherheitsabstand
        if (x >= building.x - margin && x < building.x + (building.width || 16) + margin &&
            z >= building.z - margin && z < building.z + (building.depth || 16) + margin) {
          return true;
        }
      }
    }
    return false;
  }

  // Prüft ob Pfad Gebäude blockiert (optimiert)
  _isPathBlocked(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    console.log(`[StreetBuilder] 🔍 Prüfe Pfad: ${totalSteps + 1} Schritte`);
    
    for (let step = 0; step <= totalSteps; step += 2) { // Weniger Checks für Performance
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      const offsets = [[-1,0],[0,-1],[0,0],[0,1],[1,0]];
      for (const [ox, oz] of offsets) {
        if (this._isPositionInBuilding(currentX + ox, currentZ + oz)) {
          console.log(`[StreetBuilder] 🚫 Blockiert bei (${currentX + ox}, ${currentZ + oz})`);
          return true;
        }
      }
    }
    return false;
  }

  // Intelligenter Umgehungsweg mit mehr Optionen
  _findDetour(buildY, x1, z1, x2, z2, maxDistance = 8) {
    console.log(`[StreetBuilder] 🔄 Suche Umweg (max ${maxDistance} Blöcke)`);
    
    // Mehrere Offset-Kombinationen testen
    const offsets = [];
    for (let dist = 1; dist <= maxDistance; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist > 1) {
        offsets.push([dist, dist], [dist, -dist], [-dist, dist], [-dist, -dist]);
      }
    }

    for (const [ox, oz] of offsets) {
      const testX1 = x1 + ox;
      const testZ1 = z1 + oz;
      const testX2 = x2 + ox;
      const testZ2 = z2 + oz;
      
      if (!this._isPathBlocked(buildY, testX1, testZ1, testX2, testZ2)) {
        console.log(`[StreetBuilder] ✅ Umweg gefunden: offset (${ox},${oz})`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    
    // Fallback: Direkte Tür-Positionen statt DoorPos verwenden
    console.log('[StreetBuilder] 🔄 Fallback: Direkte Positionen testen');
    const fallbackX1 = x1 - 8, fallbackZ1 = z1;
    const fallbackX2 = x2 - 8, fallbackZ2 = z2;
    
    if (!this._isPathBlocked(buildY, fallbackX1, fallbackZ1, fallbackX2, fallbackZ2)) {
      console.log('[StreetBuilder] ✅ Fallback-Weg gefunden');
      return { x1: fallbackX1, z1: fallbackZ1, x2: fallbackX2, z2: fallbackZ2 };
    }
    
    return null;
  }

  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    let fromX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    let fromZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    let toX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    let toZ = toBuilding.z + (toBuilding.doorPos?.z || 0);

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY} von (${fromX},${fromZ}) nach (${toX},${toZ})`);

    // Prüfe direkten Weg
    let finalX1 = fromX, finalZ1 = fromZ, finalX2 = toX, finalZ2 = toZ;
    if (this._isPathBlocked(buildY, fromX, fromZ, toX, toZ)) {
      const detour = this._findDetour(buildY, fromX, fromZ, toX, toZ);
      if (detour) {
        finalX1 = detour.x1; finalZ1 = detour.z1;
        finalX2 = detour.x2; finalZ2 = detour.z2;
      } else {
        console.log('[StreetBuilder] ❌ ALLE Wege blockiert - baue trotzdem mit Warnung!');
        // Fallback: Baue trotzdem den direkten Weg
        finalX1 = fromX; finalZ1 = fromZ; finalX2 = toX; finalZ2 = toZ;
      }
    }

    console.log(`[StreetBuilder] 🏗️ Finaler Weg: (${finalX1},${finalZ1}) → (${finalX2},${finalZ2})`);
    
    await this._clearAbove(buildY, finalX1, finalZ1, finalX2, finalZ2);
    await this._buildPath(buildY, finalX1, finalZ1, finalX2, finalZ2);
    await this._buildStreetLanterns(buildY, finalX1, finalZ1, finalX2, finalZ2);

    this.streets.push({
      from: { name: fromBuilding.name || 'unknown', x: finalX1, z: finalZ1 },
      to: { name: toBuilding.name || 'unknown', x: finalX2, z: finalZ2 },
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

  async _buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 💡 Straßenlaternen y=${buildY}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 6;

    const dirX = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : -1) : 0;
    const dirZ = Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? 1 : -1) : 0;
    
    const leftOffset = dirX ? [0, dirZ ? dirZ : 1] : [dirZ ? -dirZ : -1, 0];
    const rightOffset = dirX ? [0, dirZ ? -dirZ : -1] : [dirZ ? dirZ : 1, 0];

    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      const leftX = currentX + leftOffset[0];
      const leftZ = currentZ + leftOffset[1];
      await this._placeStreetLantern(buildY, leftX, leftZ);

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
