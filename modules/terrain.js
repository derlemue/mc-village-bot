class TerrainPreparer {
  constructor(bot) {
    this.bot = bot;
  }

  async prepareBuildingArea(building) {
    const { x, y, z, width, depth } = building;
    
    // ✅ FUNDAMENT 10-40 größer!
    const extraSizeX = 10 + Math.floor(Math.random() * 30);
    const extraSizeZ = 10 + Math.floor(Math.random() * 30);
    const fundX = x - Math.floor(extraSizeX/2);
    const fundZ = z - Math.floor(extraSizeZ/2);
    const fundWidth = width + extraSizeX;
    const fundDepth = depth + extraSizeZ;
    
    console.log(`[TerrainPreparer] 📐 Bereite ${width}x${depth} bei (${x},${y},${z}) vor`);
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT ${fundWidth}x${fundDepth} (+${extraSizeX}/${extraSizeZ})`);

    await this._buildSmallFoundation(fundX, fundZ, fundWidth, fundDepth, y);
    await this._clearSkyArea(x, z, width, depth, y);
    console.log('[TerrainPreparer] ✅ Vorbereitung komplett');
  }

  async _buildSmallFoundation(x, z, width, depth, buildingY) {
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT y=61 bis ${buildingY-1}`);
    
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        for (let by = 61; by < buildingY; by++) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} deepslate_tiles`);
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }
    console.log('[TerrainPreparer] ✅ FUNDAMENT GEBAUT');
  }

  async _clearSkyArea(x, z, width, depth, buildY) {
    const skyTop = Math.min(buildY + 128, 256);
    console.log(`[TerrainPreparer] 🌤️ Freiräumen y=${buildY} bis y=${skyTop}`);
    
    for (let bx = x - 2; bx < x + width + 2; bx++) {
      for (let bz = z - 2; bz < z + depth + 2; bz++) {
        for (let by = buildY; by < skyTop; by += 4) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} air`);
          await new Promise(r => setTimeout(r, 3));
        }
      }
    }
    console.log('[TerrainPreparer] ✅ Sky Area geleert');
  }
}

module.exports = TerrainPreparer;
