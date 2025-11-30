class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    
    console.log(`[Builder] 🏗️ ${templateData.name} bei (${x},${y},${z}) ${width}x${height}x${depth}`);

    // Phase 1: Fundament
    const foundationBlock = templateData.foundation || 'stone_bricks';
    console.log(`[Builder] 🧱 Fundament ${foundationBlock}`);
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        this.bot.chat(`/setblock ${bx} ${y} ${bz} ${foundationBlock}`);
        await new Promise(r => setTimeout(r, 2));
      }
    }

    // Phase 2: Wände
    const wallBlock = templateData.walls || 'spruce_wood';
    console.log(`[Builder] 🏢 Wände ${wallBlock}`);
    for (let by = y + 1; by < y + height - 1; by++) {
      for (let bx = x; bx < x + width; bx++) {
        this.bot.chat(`/setblock ${bx} ${by} ${z} ${wallBlock}`);
        this.bot.chat(`/setblock ${bx} ${by} ${z + depth - 1} ${wallBlock}`);
      }
      for (let bz = z + 1; bz < z + depth - 1; bz++) {
        this.bot.chat(`/setblock ${x} ${by} ${bz} ${wallBlock}`);
        this.bot.chat(`/setblock ${x + width - 1} ${by} ${bz} ${wallBlock}`);
      }
      await new Promise(r => setTimeout(r, 50));
    }

    // Phase 3: Dach
    const roofBlock = templateData.roof || 'spruce_stairs';
    console.log(`[Builder] 🏠 Dach ${roofBlock}`);
    for (let bx = x; bx < x + width; bx++) {
      for (let bz = z; bz < z + depth; bz++) {
        this.bot.chat(`/setblock ${bx} ${y + height - 1} ${bz} ${roofBlock}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`[Builder] ✅ GEBÄUDE KOMPLETT!`);
    return { status: 'success' };
  }
}

module.exports = Builder;
