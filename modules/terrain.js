class TerrainPreparer {
  constructor(bot) {
    this.bot = bot;
  }

  async prepareBuildingArea(building) {
    const { x, y, z, width, depth } = building;

    console.log(`[TerrainPreparer] 📐 Bereite ${width}x${depth} bei (${x},${y},${z}) vor`);

    // 1. FUNDAMENT mit setblock
    await this._buildSmallFoundation(x, z, width, depth, y);
    
    // 2. Freiräumen y+128 (max 256!)
    await this._clearSkyArea(x, z, width, depth, y);

    console.log('[TerrainPreparer] ✅ Vorbereitung komplett');
  }

  async _buildSmallFoundation(x, z, width, depth, buildingY) {
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT y=60 bis ${buildingY-1}`);
    
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        for (let by = 60; by < buildingY; by++) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} deepslate_tiles`);
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }
    console.log('[TerrainPreparer] ✅ FUNDAMENT GEBAUT');
  }

  async _clearSkyArea(x, z, width, depth, buildY) {
    const skyTop = Math.min(buildY + 128, 256);  // ✅ MAX Y=256!
    console.log(`[TerrainPreparer] 🌤️ Freiräumen y=${buildY} bis y=${skyTop} (${skyTop - buildY} Blöcke hoch)`);
    
    for (let bx = x - 2; bx < x + width + 2; bx++) {
      for (let bz = z - 2; bz < z + depth + 2; bz++) {
        for (let by = buildY; by < skyTop; by++) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} air`);
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }
    console.log('[TerrainPreparer] ✅ Sky Area geleert (bis y=' + skyTop + ')');
  }
}

module.exports = TerrainPreparer;
