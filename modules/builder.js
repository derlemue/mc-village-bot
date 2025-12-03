const fs = require('fs');
const path = require('path');

class Builder {
  constructor(bot) {
    this.bot = bot;
    this.streetsFile = path.join(process.cwd(), 'data', 'streets.json');
    this.streets = this.loadStreets();
  }

  loadStreets() {
    try {
      if (fs.existsSync(this.streetsFile)) {
        const content = fs.readFileSync(this.streetsFile, 'utf8');
        if (content.trim()) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.log('Builder Load streets Fehler:', e.message);
    }
    return [];
  }

  // Prüft ob Position in bestehender Straße liegt (5x3 Breite)
  isPositionInStreet(x, z) {
    for (const street of this.streets) {
      const dx = street.to.x - street.from.x;
      const dz = street.to.z - street.from.z;
      const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
      
      for (let step = 0; step <= totalSteps; step++) {
        const progress = step / totalSteps;
        const streetX = Math.round(street.from.x + dx * progress);
        const streetZ = Math.round(street.from.z + dz * progress);
        
        // Prüfe 5x3 Straßenbereich um jeden Straßenpunkt
        for (let ox = -2; ox <= 2; ox++) {
          for (let oz = -1; oz <= 1; oz++) {
            if (x === streetX + ox && z === streetZ + oz) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    console.log(`Builder ${templateData.name} bei ${x},${y},${z} ${width}x${height}x${depth}`);
    
    try {
      // Phase 1: Fundament - OPTIMIZED mit fill, aber Street-Check
      const foundationBlock = templateData.foundation || 'stone_bricks';
      console.log(`Builder Fundament ${foundationBlock}`);
      
      // Prüfe jedes Fundament-Block auf Straßenkollision
      for (let fx = x; fx < x + width; fx++) {
        for (let fz = z; fz < z + depth; fz++) {
          if (!this.isPositionInStreet(fx, fz)) {
            this.bot.chat(`/setblock ${fx} ${y} ${fz} ${foundationBlock}`);
            await new Promise(r => setTimeout(r, 10));
          } else {
            console.log(`Builder Fundament ${fx},${fz} übersprungen - Straße!`);
          }
        }
      }
      await new Promise(r => setTimeout(r, 200));

      // Connection Check
      if (!this.bot.player || !this.bot.player.entity) {
        throw new Error('Connection lost during foundation');
      }

      // Phase 2: Wände - OPTIMIZED mit fill pro Wandseite, aber Street-Check
      const wallBlock = templateData.walls || 'spruce_planks';
      console.log(`Builder Wände ${wallBlock}`);
      
      // Vordere Wand (Z = z)
      for (let wx = x; wx < x + width; wx++) {
        for (let wy = y + 1; wy < y + height - 1; wy++) {
          if (!this.isPositionInStreet(wx, z)) {
            this.bot.chat(`/setblock ${wx} ${wy} ${z} ${wallBlock}`);
            await new Promise(r => setTimeout(r, 5));
          }
        }
      }
      
      // Hintere Wand (Z = z + depth - 1)
      for (let wx = x; wx < x + width; wx++) {
        for (let wy = y + 1; wy < y + height - 1; wy++) {
          if (!this.isPositionInStreet(wx, z + depth - 1)) {
            this.bot.chat(`/setblock ${wx} ${wy} ${z + depth - 1} ${wallBlock}`);
            await new Promise(r => setTimeout(r, 5));
          }
        }
      }
      
      // Linke Wand (X = x)
      for (let wz = z + 1; wz < z + depth - 1; wz++) {
        for (let wy = y + 1; wy < y + height - 1; wy++) {
          if (!this.isPositionInStreet(x, wz)) {
            this.bot.chat(`/setblock ${x} ${wy} ${wz} ${wallBlock}`);
            await new Promise(r => setTimeout(r, 5));
          }
        }
      }
      
      // Rechte Wand (X = x + width - 1)
      for (let wz = z + 1; wz < z + depth - 1; wz++) {
        for (let wy = y + 1; wy < y + height - 1; wy++) {
          if (!this.isPositionInStreet(x + width - 1, wz)) {
            this.bot.chat(`/setblock ${x + width - 1} ${wy} ${wz} ${wallBlock}`);
            await new Promise(r => setTimeout(r, 5));
          }
        }
      }

      // Connection Check nach Wänden
      if (!this.bot.player || !this.bot.player.entity) {
        throw new Error('Connection lost during walls');
      }

      // Phase 3: Dach - OPTIMIZED mit fill
      const roofBlock = templateData.roof || 'spruce_stairs';
      console.log(`Builder Dach ${roofBlock}`);
      this.bot.chat(`/fill ${x} ${y + height - 1} ${z} ${x + width - 1} ${y + height - 1} ${z + depth - 1} ${roofBlock}`);
      await new Promise(r => setTimeout(r, 300));

      // Phase 4: Details/Türen/Deko - Einzelne setblock für Präzision
      if (templateData.details) {
        console.log('Builder Details platzieren');
        for (const detail of templateData.details) {
          const dx = x + detail.x;
          const dz = z + detail.z;
          if (!this.isPositionInStreet(dx, dz)) {
            this.bot.chat(`/setblock ${dx} ${y + detail.y} ${dz} ${detail.block}`);
            await new Promise(r => setTimeout(r, 100));
          } else {
            console.log(`Builder Detail ${dx},${dz} übersprungen - Straße!`);
          }
        }
      }

      // Phase 5: Tür falls doorPos definiert
      if (templateData.doorPos) {
        const doorX = x + templateData.doorPos.x;
        const doorY = y + (templateData.doorPos.y || 1);
        const doorZ = z + templateData.doorPos.z;
        console.log(`Builder Tür bei ${doorX},${doorY},${doorZ}`);
        // Tür immer platzieren (auch auf Straße, da sie offen ist)
        this.bot.chat(`/setblock ${doorX} ${doorY} ${doorZ} spruce_door`);
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`Builder GEBÄUDE KOMPLETT! ${width}x${height}x${depth}`);
      return { status: 'success', blocksPlaced: width * height * depth };

    } catch (error) {
      console.error('Builder Build failed:', error.message);
      // Graceful disconnect und Reconnect-Vorbereitung
      if (this.bot.player && this.bot.player.entity) {
        this.bot.chat('say Build failed - reconnecting...');
        await new Promise(r => setTimeout(r, 1000));
      }
      throw error; // Weiterwerfen für höhere Ebenen
    }
  }

  // Helper: Connection prüfen und reconnect wenn nötig
  async reconnectIfNeeded() {
    if (!this.bot.player || !this.bot.player.entity) {
      console.log('Builder Reconnecting...');
      // Hier könnte bot.quit() + reconnect logic implementiert werden
      throw new Error('Bot disconnected - manual reconnect required');
    }
  }
}

module.exports = Builder;
