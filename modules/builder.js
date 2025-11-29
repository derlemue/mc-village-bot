class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    
    console.log(`[Builder] 🏗️ BAUE ${templateData.name} bei (${x},${y},${z}) ${width}x${height}x${depth}`);
    console.log(`[Builder] 🧱 Block-Typen: fund=${templateData.foundation}, walls=${templateData.walls}, roof=${templateData.roof}`);

    try {
      // Phase 1: Terrain clearen (schnell!)
      console.log('[Builder] 🧹 Phase 1: Clear...');
      for (let bx = x; bx < x + width; bx += 2) {  // JEDEN 2. Block
        for (let bz = z; bz < z + depth; bz += 2) {
          for (let by = y; by < y + height; by += 2) {
            this.bot.chat(`/setblock ${bx} ${by} ${bz} air`);
            await new Promise(r => setTimeout(r, 2));  // SEHR schnell!
          }
        }
      }
      console.log('[Builder] ✅ Phase 1 OK');

      // Phase 2: FUNDAMENT (VOLL!)
      const foundationHeight = templateData.foundationHeight || 1;
      const foundationBlock = templateData.foundation || 'stone_bricks';
      console.log(`[Builder] 🧱 Phase 2: Fundament ${foundationHeight}x${width}x${depth}`);
      for (let bx = x; bx < x + width; bx++) {
        for (let bz = z; bz < z + depth; bz++) {
          for (let by = y; by < y + foundationHeight; by++) {
            this.bot.chat(`/setblock ${bx} ${by} ${bz} ${foundationBlock}`);
            await new Promise(r => setTimeout(r, 2));
          }
        }
      }
      console.log('[Builder] ✅ Phase 2 FUNDAMENT SICHTBAR!');

      // Phase 3: WÄNDE (nur Außen + unten)
      const wallBlock = templateData.walls || 'spruce_wood';
      console.log(`[Builder] 🏢 Phase 3: Wände ${wallBlock}`);
      let wallCount = 0;
      for (let bx = x; bx < x + width; bx++) {
        for (let bz = z; bz < z + depth; bz++) {
          for (let by = y + foundationHeight; by < y + height - 1; by++) {
            // Außenwände + untere 2 Reihen innen
            if (bx === x || bx === x + width - 1 || bz === z || bz === z + depth - 1 || by < y + foundationHeight + 2) {
              this.bot.chat(`/setblock ${bx} ${by} ${bz} ${wallBlock}`);
              wallCount++;
              await new Promise(r => setTimeout(r, 2));
            }
          }
        }
      }
      console.log('[Builder] ✅ Phase 3 Wände OK (' + wallCount + ' Blöcke)');

      // Phase 4: DACH (VOLL!)
      const roofBlock = templateData.roof || 'spruce_stairs';
      console.log(`[Builder] 🏠 Phase 4: Dach ${roofBlock}`);
      for (let bx = x; bx < x + width; bx++) {
        for (let bz = z; bz < z + depth; bz++) {
          this.bot.chat(`/setblock ${bx} ${y + height - 1} ${bz} ${roofBlock}`);
          await new Promise(r => setTimeout(r, 2));
        }
      }
      console.log('[Builder] ✅ Phase 4 DACH SICHTBAR!');

      // Phase 5: Details
      if (templateData.details?.length > 0) {
        console.log(`[Builder] ✨ Phase 5: ${templateData.details.length} Details`);
        for (const detail of templateData.details) {
          this.bot.chat(`/setblock ${x + detail.x} ${y + detail.y} ${z + detail.z} ${detail.block}`);
          await new Promise(r => setTimeout(r, 100));
        }
      }

      console.log(`[Builder] ✅ GEBÄUDE KOMPLETT! 🎉 (${width*depth*height} Blöcke)`);
      return { status: 'success' };
    } catch (error) {
      console.log(`[Builder] ❌ FEHLER: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = Builder;
