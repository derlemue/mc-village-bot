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

  // Prüft ob Position in Gebäude liegt
  _isPositionInBuilding(x, z) {
    for (const village of this.villages) {
      for (const building of village.buildings || []) {
        if (x >= building.x && x < building.x + (building.width || 16) &&
            z >= building.z && z < building.z + (building.depth || 16)) {
          return true;
        }
      }
    }
    return false;
  }

  // Prüft ob kompletter Pfad frei von Gebäuden ist
  _isPathFree(buildY, x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // Prüfe 5x3 Straße-Bereich
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          if (this._isPositionInBuilding(currentX + ox, currentZ + oz)) {
            console.log(`[StreetBuilder] 🚫 Gebäude bei (${currentX + ox}, ${currentZ + oz})`);
            return false;
          }
        }
      }
    }
    return true;
  }

  // Finde nächste bestehende Straße
  _findNearestStreet(x, z, maxDistance = 10) {
    for (const street of this.streets) {
      const distFrom = Math.max(Math.abs(street.from.x - x), Math.abs(street.from.z - z));
      const distTo = Math.max(Math.abs(street.to.x - x), Math.abs(street.to.z - z));
      
      if (distFrom <= maxDistance || distTo <= maxDistance) {
        console.log(`[StreetBuilder] 🔗 Gefunden Straße zu (${street.from.x},${street.from.z}) dist:${distFrom}`);
        return street.from;
      }
    }
    return null;
  }

  // Intelligenter Umweg-Finder
  _findValidPath(buildY, x1, z1, x2, z2, maxAttempts = 12) {
    console.log(`[StreetBuilder] 🔍 Suche freien Pfad...`);
    
    const offsets = [];
    for (let dist = 1; dist <= maxAttempts; dist++) {
      offsets.push([dist, 0], [-dist, 0], [0, dist], [0, -dist]);
      if (dist > 2) {
        offsets.push([dist, dist], [dist, -dist], [-dist, dist], [-dist, -dist]);
      }
    }

    for (const [ox, oz] of offsets) {
      const testX1 = x1 + ox;
      const testZ1 = z1 + oz;
      const testX2 = x2 + ox;
      const testZ2 = z2 + oz;
      
      if (this._isPathFree(buildY, testX1, testZ1, testX2, testZ2)) {
        console.log(`[StreetBuilder] ✅ Freier Pfad gefunden: offset (${ox},${oz})`);
        return { x1: testX1, z1: testZ1, x2: testX2, z2: testZ2 };
      }
    }
    return null;
  }

  // ✅ KOMPATIBILITÄT: buildStreetToBuilding (für index.js)
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    let fromX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
    let fromZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    let toX = toBuilding.x + (toBuilding.doorPos?.x || 8);
    let toZ = toBuilding.z + (toBuilding.doorPos?.z || 0);

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY} von (${fromX},${fromZ}) nach (${toX},${toZ})`);

    let path = { x1: fromX, z1: fromZ, x2: toX, z2: toZ };
    if (!this._isPathFree(buildY, fromX, fromZ, toX, toZ)) {
      path = this._findValidPath(buildY, fromX, fromZ, toX, toZ);
      if (!path) {
        console.log('[StreetBuilder] ❌ KEIN freier Pfad gefunden - überspringe!');
        return;
      }
    }

    await this._clearAbove(buildY, path.x1, path.z1, path.x2, path.z2);
    await this._buildPath(buildY, path.x1, path.z1, path.x2, path.z2);
    await this._buildStreetLanterns(buildY, path.x1, path.z1, path.x2, path.z2);

    this.streets.push({
      from: { name: fromBuilding.name || 'unknown', x: path.x1, z: path.z1 },
      to: { name: toBuilding.name || 'unknown', x: path.x2, z: path.z2 },
      buildY: buildY, timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  // ✅ KOMPATIBILITÄT: buildLanternPosts (für index.js Zeile 112)
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
        await this._placeLantern(buildY, pos.x, pos.z);
        seen.add(key);
      }
    }
  }

  // FLEXIBLER Build-Befehl: Koordinaten ODER Gebäude
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
      fromX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
      fromZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    } else {
      fromX = this.villages[0]?.buildings?.[0]?.x + 8 || 0;
      fromZ = this.villages[0]?.buildings?.[0]?.z || 0;
    }

    let finalX2, finalZ2;
    if (targetX !== undefined) {
      finalX2 = targetX;
      finalZ2 = targetZ;
    } else {
      finalX2 = toBuilding.x + (toBuilding.doorPos?.x || 8);
      finalZ2 = toBuilding.z + (toBuilding.doorPos?.z || 0);
    }

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY} von (${fromX},${fromZ}) nach (${finalX2},${finalZ2})`);

    let path = { x1: fromX, z1: fromZ, x2: finalX2, z2: finalZ2 };
    if (!this._isPathFree(buildY, fromX, fromZ, finalX2, finalZ2)) {
      path = this._findValidPath(buildY, fromX, fromZ, finalX2, finalZ2);
      if (!path) {
        console.log('[StreetBuilder] ❌ KEIN freier Pfad gefunden - überspringe!');
        return;
      }
    }

    await this._clearAbove(buildY, path.x1, path.z1, path.x2, path.z2);
    await this._buildPath(buildY, path.x1, path.z1, path.x2, path.z2);
    await this._buildStreetLanterns(buildY, path.x1, path.z1, path.x2, path.z2);

    this.streets.push({
      from: { name: fromBuilding?.name || 'village-center', x: path.x1, z: path.z1 },
      to: { name: toBuilding?.name || `coord-${path.x2},${path.z2}`, x: path.x2, z: path.z2 },
      buildY: buildY, timestamp: new Date().toISOString()
    });
    this.saveStreets();
  }

  async _clearAbove(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 🧹 Freiräumen oberhalb y=${buildY}`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));

    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          for (let clearY = buildY + 1; clearY <= buildY + 5; clearY++) {
            this.bot.chat(`/setblock ${currentX+ox} ${clearY} ${currentZ+oz} air`);
            await new Promise(r => setTimeout(r, 5));
          }
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
      
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          this.bot.chat(`/setblock ${currentX+ox} ${buildY} ${currentZ+oz} stone_bricks`);
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }
    console.log('[StreetBuilder] ✅ Straße fertig y=' + buildY);
  }

  async _buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 💡 Straßenlaternen (links/rechts, 1 Block Abstand)`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 6;

    const isHorizontal = Math.abs(dx) > Math.abs(dz);
    const leftOff = isHorizontal ? [0, 3] : [-3, 0];
    const rightOff = isHorizontal ? [0, -3] : [3, 0];

    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      await this._placeLantern(buildY, currentX + leftOff[0], currentZ + leftOff[1]);
      await this._placeLantern(buildY, currentX + rightOff[0], currentZ + rightOff[1]);
    }
  }

  async _placeLantern(buildY, x, z) {
    this.bot.chat(`/setblock ${x} ${buildY} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 50));
    this.bot.chat(`/setblock ${x} ${buildY+1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 50));
  }
}

module.exports = StreetBuilder;
