// terrain.js - OPTIMIZED WITH /FILL COMMANDS

const CommandHelper = require('./commandHelper');

class TerrainPreparer {
  constructor(bot) {
    this.bot = bot;
    this.commandHelper = new CommandHelper(bot);
  }

  async prepareBuildingArea(building) {
    const { x, y, z, width, depth } = building;

    // FUNDAMENT 10-40 größer! (Optimized: 100x100 fixed clearing if schematic is large, but keeping logic relative to size)
    // Actually, user wanted 100x100 area.
    // If the building is the 100x100 freiraum, width/depth will be 100.
    // We add extra size on top.

    const extraSizeX = 10 + Math.floor(Math.random() * 30);
    const extraSizeZ = 10 + Math.floor(Math.random() * 30);
    const fundX = x - Math.floor(extraSizeX / 2);
    const fundZ = z - Math.floor(extraSizeZ / 2);
    const fundWidth = width + extraSizeX;
    const fundDepth = depth + extraSizeZ;

    console.log(`[TerrainPreparer] 📐 Bereite ${width}x${depth} bei (${x},${y},${z}) vor`);
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT ${fundWidth}x${fundDepth} (+${extraSizeX}/${extraSizeZ}) bei (${fundX},${fundZ})`);

    // ✅ SCHRITT 1: Fundament bauen (/fill)
    await this._buildSmallFoundation(fundX, fundZ, fundWidth, fundDepth, y + 1);

    // ✅ SCHRITT 2: Sky-Bereich über gesamter FUNDAMENT-Fläche freiräumen (/fill)
    await this._clearSkyAreaAboveFoundation(fundX, fundZ, fundWidth, fundDepth, y + 1);

    console.log('[TerrainPreparer] ✅ Vorbereitung komplett');
  }

  async _buildSmallFoundation(x, z, width, depth, buildingY) {
    console.log(`[TerrainPreparer] 🧱 FUNDAMENT y=61 bis ${buildingY + 1}`);

    // Fill from 61 to buildingY - 1
    // buildingY is where the building starts (floor level).
    // Original loop: for (let by = 61; by < buildingY; by++) -> setblock
    // So fill range: 61 to buildingY - 1

    if (buildingY > 61) {
      await this.commandHelper.fill(x, 61, z, x + width - 1, buildingY - 1, z + depth - 1, 'stone_bricks');
    }

    console.log(`[TerrainPreparer] ✅ FUNDAMENT FERTIG`);
  }

  async _clearSkyAreaAboveFoundation(fundX, fundZ, fundWidth, fundDepth, buildingY) {
    // ✅ FIX: Nutze FUNDAMENT-Koordinaten, nicht Gebäude-Koordinaten!
    const skyTop = Math.min(buildingY + 128, 256);
    const clearStartX = fundX;
    const clearEndX = fundX + fundWidth; // Loop was < clearEndX, so inclusive is -1
    const clearStartZ = fundZ;
    const clearEndZ = fundZ + fundDepth;

    console.log(`[TerrainPreparer] 🌤️ Freiräumen über FUNDAMENT:`);
    console.log(`[TerrainPreparer]   X: ${clearStartX} bis ${clearEndX} (${fundWidth} Blöcke)`);
    console.log(`[TerrainPreparer]   Z: ${clearStartZ} bis ${clearEndZ} (${fundDepth} Blöcke)`);
    console.log(`[TerrainPreparer]   Y: ${buildingY} bis ${skyTop} (${skyTop - buildingY} Ebenen)`);

    // Fill air
    await this.commandHelper.fill(clearStartX, buildingY, clearStartZ, clearEndX - 1, skyTop, clearEndZ - 1, 'air');

    console.log(`[TerrainPreparer] ✅ Sky Area 100% geleert!`);
  }
}

module.exports = TerrainPreparer;
