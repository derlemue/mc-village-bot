class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    
    console.log(`[Builder] 🏗️ WorldEdit Bau: ${templateData.name} bei (${x},${y},${z})`);
    console.log(`[Builder] 📐 Bereich: ${width}x${height}x${depth}`);

    try {
      // ✅ DEBUG: WorldEdit Ops prüfen
      this.bot.chat('//wand');
      await new Promise(r => setTimeout(r, 500));
      
      // Phase 1: Lokales Terrain clearen (KLEINER Bereich)
      console.log('[Builder] 📍 Phase 1: Terrain-Clearing (WorldEdit)');
      await this._worldEditSet(x, y, z, x+width-1, y+height-1, z+depth-1, 'air');
      console.log('[Builder] ✅ Terrain geleert');

      // Phase 2: Fundament
      const foundationHeight = templateData.foundationHeight || 1;
      console.log(`[Builder] 🧱 Phase 2: Fundament (${templateData.foundation || 'stone_bricks'})`);
      await this._worldEditSet(x, y, z, x+width-1, y+foundationHeight-1, z+depth-1, templateData.foundation || 'stone_bricks');
      console.log('[Builder] ✅ Fundament gebaut');

      // Phase 3: Wände
      console.log(`[Builder] 🏢 Phase 3: Wände (${templateData.walls || 'spruce_wood'})`);
      await this._worldEditSet(x, y+foundationHeight, z, x+width-1, y+height-2, z+depth-1, templateData.walls || 'spruce_wood');
      console.log('[Builder] ✅ Wände gebaut');

      // Phase 4: Dach
      console.log(`[Builder] 🎩 Phase 4: Dach (${templateData.roof || 'spruce_stairs'})`);
      await this._worldEditSet(x, y+height-2, z, x+width-1, y+height-1, z+depth-1, templateData.roof || 'spruce_stairs');
      console.log('[Builder] ✅ Dach gebaut');

      // Phase 5: Details
      if (templateData.details?.length > 0) {
        console.log(`[Builder] ✨ Phase 5: ${templateData.details.length} Details`);
        for (const detail of templateData.details) {
          this.bot.chat(`/setblock ${x+detail.x} ${y+detail.y} ${z+detail.z} ${detail.block}`);
          await new Promise(r => setTimeout(r, 200));
        }
        console.log('[Builder] ✅ Details fertig');
      }

      console.log(`[Builder] ✅ Gebäude komplett! (${width*depth*height} Blöcke)`);
      return { status: 'success' };
    } catch (error) {
      console.log(`[Builder] ❌ FEHLER: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  // ✅ WORLD EDIT HELPER (korrekte Syntax)
  async _worldEditSet(x1, y1, z1, x2, y2, z2, block) {
    console.log(`[Builder] [WorldEdit] //pos1 ${x1} ${y1} ${z1}`);
    this.bot.chat(`//pos1 ${x1} ${y1} ${z1}`);
    await new Promise(r => setTimeout(r, 300));
    
    console.log(`[Builder] [WorldEdit] //pos2 ${x2} ${y2} ${z2}`);
    this.bot.chat(`//pos2 ${x2} ${y2} ${z2}`);
    await new Promise(r => setTimeout(r, 300));
    
    console.log(`[Builder] [WorldEdit] //set ${block}`);
    this.bot.chat(`//set ${block}`);
    await new Promise(r => setTimeout(r, 2000)); // Länger warten!
  }
}

module.exports = Builder;
