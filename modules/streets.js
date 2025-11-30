const fs = require('fs');
const path = require('path');

class StreetBuilder {
  constructor(bot) {
    this.bot = bot;
    this.streetsFile = path.join(process.cwd(), 'data', 'streets.json');
    this.streets = this._loadStreets();
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
      console.log('[StreetBuilder] ⚠️ Load Fehler:', e.message);
    }
    return [];
  }

  saveStreets() {
    try {
      fs.writeFileSync(this.streetsFile, JSON.stringify(this.streets, null, 2), 'utf8');
    } catch (e) {
      console.log('[StreetBuilder] ❌ Save Fehler:', e.message);
    }
  }

  async buildStreetToBuilding(buildY, fromBuilding, toBuilding) {
    const fromDoorPos = fromBuilding.doorPos || { x: 8, z: 0 };
    const toDoorPos = toBuilding.doorPos || { x: 8, z: 0 };
    
    const fromX = fromBuilding.x + fromDoorPos.x;
    const fromZ = fromBuilding.z + fromDoorPos.z;
    const toX = toBuilding.x + toDoorPos.x;
    const toZ = toBuilding.z + toDoorPos.z;

    console.log(`[StreetBuilder] 🛣️ Straße y=${buildY-2} von (${fromX},${fromZ}) nach (${toX},${toZ})`);
    await this._buildPath(buildY - 2, fromX, fromZ, toX, toZ);  // ✅ Y-2!

    this.streets.push({
      from: { name: fromBuilding.name || 'unknown', x: fromX, z: fromZ },
      to: { name: toBuilding.name || 'unknown', x: toX, z: toZ },
      buildY: buildY - 2, timestamp: new Date().toISOString()
    });
    this.saveStreets();
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

  async buildLanternPosts(buildY, building) {
    console.log(`[StreetBuilder] 💡 ${building.name} Laternen y=${buildY-1}`);
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
        await this._placeLantern(buildY - 1, pos.x, pos.z);  // ✅ Y-1!
        seen.add(key);
      }
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
