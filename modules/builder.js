class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    
    console.log(`[Builder] 🏗️ ${templateData.name} bei (${x},${y},${z}) ${width}x${height}x${depth}`);

    try {
      // Phase 1: Fundament - OPTIMIZED mit /fill
      const foundationBlock = templateData.foundation || 'stone_bricks';
      console.log(`[Builder] 🧱 Fundament ${foundationBlock}`);
      
      // Batch-Fill für gesamtes Fundament
      this.bot.chat(`/fill ${x} ${y} ${z} ${x+width-1} ${y} ${z+depth-1} ${foundationBlock}`);
      await new Promise(r => setTimeout(r, 200)); // Längerer Delay

      // Connection Check
      if (!this.bot.isConnected()) {
        throw new Error('Connection lost during foundation');
      }

      // Phase 2: Wände - OPTIMIZED mit /fill für jede Wandseite
      const wallBlock = templateData.walls || 'spruce_wood';
      console.log(`[Builder] 🏢 Wände ${wallBlock}`);
      
      // Vordere Wand
      this.bot.chat(`/fill ${x} ${y+1} ${z} ${x+width-1} ${y+height-2} ${z} ${wallBlock}`);
      await new Promise(r => setTimeout(r, 150));
      
      // Hintere Wand  
      this.bot.chat(`/fill ${x} ${y+1} ${z+depth-1} ${x+width-1} ${y+height-2} ${z+depth-1} ${wallBlock}`);
      await new Promise(r => setTimeout(r, 150));
      
      // Linke Wand
      this.bot.chat(`/fill ${x} ${y+1} ${z+1} ${x} ${y+height-2} ${z+depth-2} ${wallBlock}`);
      await new Promise(r => setTimeout(r, 150));
      
      // Rechte Wand
      this.bot.chat(`/fill ${x+width-1} ${y+1} ${z+1} ${x+width-1} ${y+height-2} ${z+depth-2} ${wallBlock}`);
      await new Promise(r => setTimeout(r, 150));

      // Connection Check nach Wänden
      if (!this.bot.isConnected()) {
        throw new Error('Connection lost during walls');
      }

      // Phase 3: Dach - OPTIMIZED mit /fill
      const roofBlock = templateData.roof || 'spruce_stairs';
      console.log(`[Builder] 🏠 Dach ${roofBlock}`);
      
      this.bot.chat(`/fill ${x} ${y+height-1} ${z} ${x+width-1} ${y+height-1} ${z+depth-1} ${roofBlock}`);
      await new Promise(r => setTimeout(r, 300)); // Extra Delay für großes Dach

      // Phase 4: Details (Türen, Deko) - Einzelne setblock für Präzision
      if (templateData.details) {
        console.log(`[Builder] ✨ Details platzieren`);
        for (const detail of templateData.details) {
          this.bot.chat(`/setblock ${x + detail.x} ${y + detail.y} ${z + detail.z} ${detail.block}`);
          await new Promise(r => setTimeout(r, 100));
          
          // Häufiger Connection Check bei Details
          if (!this.bot.isConnected()) {
            throw new Error('Connection lost during details');
          }
        }
      }

      // Phase 5: Türen (falls doorPos definiert)
      if (templateData.doorPos) {
        const doorX = x + templateData.doorPos.x;
        const doorY = y + templateData.doorPos.y;
        const doorZ = z + templateData.doorPos.z;
        console.log(`[Builder] 🚪 Tür bei ${doorX},${doorY},${doorZ}`);
        this.bot.chat(`/setblock ${doorX} ${doorY} ${doorZ} oak_door`);
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`[Builder] ✅ GEBÄUDE KOMPLETT! (${width}x${height}x${depth})`);
      return { status: 'success', blocksPlaced: width*height*depth };

    } catch (error) {
      console.error(`[Builder] ❌ Build failed: ${error.message}`);
      
      // Graceful disconnect und Reconnect-Vorbereitung
      if (this.bot.isConnected()) {
        this.bot.chat('/say Build failed - reconnecting...');
        await new Promise(r => setTimeout(r, 1000));
      }
      
      throw error; // Weiterwerfen für höhere Ebenen
    }
  }

  // Helper: Connection prüfen und reconnect wenn nötig
  async reconnectIfNeeded() {
    if (!this.bot.isConnected()) {
      console.log('[Builder] 🔌 Reconnecting...');
      // Hier könnte bot.quit() + reconnect logic implementiert werden
      throw new Error('Bot disconnected - manual reconnect required');
    }
  }
}

module.exports = Builder;
