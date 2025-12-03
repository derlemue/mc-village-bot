class TerrainPreparer {
  constructor(bot) {
    this.bot = bot;
  }

  async prepareBuildingArea(building) {
    const { x, y, z, width, depth } = building;
    
    // FUNDAMENT 10-40 größer!
    const extraSizeX = 10 + Math.floor(Math.random() * 30);
    const extraSizeZ = 10 + Math.floor(Math.random() * 30);
    const fundX = x - Math.floor(extraSizeX / 2);
    const fundZ = z - Math.floor(extraSizeZ / 2);
    const fundWidth = width + extraSizeX;
    const fundDepth = depth + extraSizeZ;
    
    console.log(`[TerrainPreparer] 📐 Bereite ${width}x${depth} bei (${x},${y},${z}) vor`);
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT ${fundWidth}x${fundDepth} (+${extraSizeX}/${extraSizeZ}) bei (${fundX},${fundZ})`);

    // ✅ SCHRITT 1: Fundament bauen
    await this._buildSmallFoundation(fundX, fundZ, fundWidth, fundDepth, y + 1);
    
    // ✅ SCHRITT 2: Sky-Bereich über gesamter FUNDAMENT-Fläche freiräumen
    await this._clearSkyAreaAboveFoundation(fundX, fundZ, fundWidth, fundDepth, y + 1);
    
    console.log('[TerrainPreparer] ✅ Vorbereitung komplett');
  }

  async _buildSmallFoundation(x, z, width, depth, buildingY) {
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT y=61 bis ${buildingY + 1}`);
    
    let blockCount = 0;
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        for (let by = 61; by < buildingY; by++) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} bricks`);
          blockCount++;
          await new Promise(r => setTimeout(r, 3));
          
          // Progress-Feedback alle 100 Blöcke
          if (blockCount % 100 === 0) {
            console.log(`[TerrainPreparer] 🧱 ${blockCount} Fundament-Blöcke platziert...`);
          }
        }
      }
    }
    console.log(`[TerrainPreparer] ✅ FUNDAMENT FERTIG (${blockCount} Blöcke)`);
  }

  async _clearSkyAreaAboveFoundation(fundX, fundZ, fundWidth, fundDepth, buildingY) {
    // ✅ FIX: Nutze FUNDAMENT-Koordinaten, nicht Gebäude-Koordinaten!
    const skyTop = Math.min(buildingY + 128, 256);
    const clearStartX = fundX;
    const clearEndX = fundX + fundWidth;
    const clearStartZ = fundZ;
    const clearEndZ = fundZ + fundDepth;
    
    console.log(`[TerrainPreparer] 🌤️ Freiräumen über FUNDAMENT:`);
    console.log(`[TerrainPreparer]   X: ${clearStartX} bis ${clearEndX} (${fundWidth} Blöcke)`);
    console.log(`[TerrainPreparer]   Z: ${clearStartZ} bis ${clearEndZ} (${fundDepth} Blöcke)`);
    console.log(`[TerrainPreparer]   Y: ${buildingY} bis ${skyTop} (${skyTop - buildingY} Ebenen)`);
    
    const totalBlocks = fundWidth * fundDepth * (skyTop - buildingY);
    console.log(`[TerrainPreparer]   📊 Total: ${totalBlocks} Blöcke zu löschen`);
    
    let blockCount = 0;
    
    // ✅ VOLLSTÄNDIGE Schleifen über gesamte Fundament-Fläche
    for (let bx = clearStartX; bx < clearEndX; bx++) {
      for (let bz = clearStartZ; bz < clearEndZ; bz++) {
        // JEDEN Block einzeln (keine Sprünge!)
        for (let by = buildingY; by < skyTop; by++) {
          this.bot.chat(`/setblock ${bx} ${by} ${bz} air`);
          blockCount++;
          await new Promise(r => setTimeout(r, 2));  // 5ms PAUSE
          
          // Progress-Feedback alle 1000 Blöcke
          if (blockCount % 1000 === 0) {
            const percent = Math.round((blockCount / totalBlocks) * 100);
            console.log(`[TerrainPreparer] 🌤️ Fortschritt: ${blockCount}/${totalBlocks} (${percent}%)`);
          }
        }
      }
    }
    
    console.log(`[TerrainPreparer] ✅ Sky Area 100% geleert! (${blockCount} Blöcke gelöscht)`);
  }
}

module.exports = TerrainPreparer;
