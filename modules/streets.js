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

      // Prüfe 5x1 Straße-Bereich
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
        return street.from; // Verbinde mit Startpunkt der Straße
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

  // FLEXIBLER Build-Befehl: Koordinaten ODER Gebäude
  async buildStreet(buildY, target) {
    let fromBuilding, toBuilding, targetX, targetZ;

    // Fall 1: Ziel-Koordinaten
    if (typeof target === 'object' && target.x !== undefined && target.z !== undefined) {
      targetX = target.x;
      targetZ = target.z;
      fromBuilding = this.streets[this.streets.length - 1]?.to || null; // Von letzter Straße
    } 
    // Fall 2: Ziel-Gebäude
    else if (typeof target === 'object' && target.name) {
      toBuilding = target;
      fromBuilding = this.streets[this.streets.length - 1]?.to || null;
    }

    // Von letzter Straße starten oder Dorf-Mitte
    let fromX, fromZ;
    if (fromBuilding) {
      fromX = fromBuilding.x + (fromBuilding.doorPos?.x || 8);
      fromZ = fromBuilding.z + (fromBuilding.doorPos?.z || 0);
    } else {
      // Dorf-Mitte als Fallback (z.B. erstes Gebäude)
      fromX = this.villages[0]?.buildings?.[0]?.x + 8 || 0;
      fromZ = this.villages[0]?.buildings?.[0]?.z || 0;
    }

    // Ziel bestimmen
    let finalX1 = fromX, finalZ1 = fromZ, finalX2, finalZ2;
    if (targetX !== undefined) {
      finalX2 = targetX;
      finalZ2 = targetZ;
    } else {
      finalX2 = toBuilding.x + (toBuilding.doorPos?.x || 8);
      finalZ2 = toBuilding.z + (toBuilding.doorPos?.z || 0);
    }

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY} von (${finalX1},${finalZ1}) nach (${finalX2},${finalZ2})`);

    // Pfad finden
    let path = { x1: finalX1, z1: finalZ1, x2: finalX2, z2: finalZ2 };
    if (!this._isPathFree(buildY, finalX1, finalZ1, finalX2, finalZ2)) {
      path = this._findValidPath(buildY, finalX1, finalZ1, finalX2, finalZ2);
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
      
      // 5x1 Straße bauen
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          this.bot.chat(`/setblock ${currentX+ox} ${buildY} ${currentZ+oz} stone_bricks`);
          await new Promise(r => setTimeout(r, 10));
        }
      }
    }
    console.log('[StreetBuilder] ✅ Straße fertig y=' + buildY);
  }

  // ✅ LATERNE: Links/Rechts (1 Block Abstand), stone_bricks (y) + lantern (y+1)
  async _buildStreetLanterns(buildY, x1, z1, x2, z2) {
    console.log(`[StreetBuilder] 💡 Straßenlaternen (links/rechts, 1 Block Abstand)`);
    const dx = x2 - x1, dz = z2 - z1;
    const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
    const interval = 10;

    // Straßenrichtung bestimmen
    const isHorizontal = Math.abs(dx) > Math.abs(dz);
    const dirX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
    const dirZ = dz > 0 ? 1 : (dz < 0 ? -1 : 0);

    // Links/Rechts perpendicular zu Straße (1 Block Abstand)
    const leftOff = isHorizontal ? [0, 3] : [-3, 0];   // Links: +Z oder +X
    const rightOff = isHorizontal ? [0, -3] : [3, 0];  // Rechts: -Z oder -X

    for (let step = 0; step <= totalSteps; step += interval) {
      const progress = step / totalSteps;
      const currentX = Math.round(x1 + dx * progress);
      const currentZ = Math.round(z1 + dz * progress);

      // Links
      await this._placeLantern(buildY, currentX + leftOff[0], currentZ + leftOff[1]);
      // Rechts
      await this._placeLantern(buildY, currentX + rightOff[0], currentZ + rightOff[1]);
    }
  }

  async _placeLantern(buildY, x, z) {
    // ✅ stone_bricks auf y, lantern auf y+1 (1 Block Abstand zur Straße)
    this.bot.chat(`/setblock ${x} ${buildY} ${z} stone_bricks`);
    await new Promise(r => setTimeout(r, 50));
    this.bot.chat(`/setblock ${x} ${buildY+1} ${z} lantern`);
    await new Promise(r => setTimeout(r, 50));
  }

  // Kompatibilität: alter buildStreetToBuilding
  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    await this.buildStreet(buildY, toBuilding);
  }
}

module.exports = StreetBuilder;
