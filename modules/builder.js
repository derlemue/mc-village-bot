class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    
    console.log(`[Builder] 🏗️ ${templateData.name} bei (${x},${y},${z})`);
    
    // Phase 1: Fundament
    const foundationBlock = templateData.foundation || 'stone_bricks';
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        this.bot.chat(`/setblock ${bx} ${y} ${bz} ${foundationBlock}`);
        await new Promise(r => setTimeout(r, 2));
      }
    }
    console.log('[Builder] ✅ Fundament');

    // Phase 2: Wände
    const wallBlock = templateData.walls || 'spruce_wood';
    for (let by = y + 1; by < y + height - 1; by++) {
      // Außenwände
      for (let bx = x; bx < x + width; bx++) {
        this.bot.chat(`/setblock ${bx} ${by} ${z} ${wallBlock}`);
        this.bot.chat(`/setblock ${bx} ${by} ${z + depth - 1} ${wallBlock}`);
        await new Promise(r => setTimeout(r, 2));
      }
      for (let bz = z + 1; bz < z + depth - 1; bz++) {
        this.bot.chat(`/setblock ${x} ${by} ${bz} ${wallBlock}`);
        this.bot.chat(`/setblock ${x + width - 1} ${by} ${bz} ${wallBlock}`);
        await new Promise(r => setTimeout(r, 2));
      }
    }
    console.log('[Builder] ✅ Wände');

    // Phase 3: Dach
    const roofBlock = templateData.roof || 'spruce_stairs';
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        this.bot.chat(`/setblock ${bx} ${y + height - 1} ${bz} ${roofBlock}`);
        await new Promise(r => setTimeout(r, 2));
      }
    }
    console.log('[Builder] ✅ Dach');
    
    return { status: 'success' };
  }
}

module.exports = Builder;
