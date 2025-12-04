// builder.js - KOMPLETT GEFIXT MIT 5x1 FUNDAMENT CHECK

const fs = require('fs');
const path = require('path');

class Builder {
  constructor(bot) {
    this.bot = bot;
  }

  loadStreets() {
    try {
      const streetsFile = path.join(process.cwd(), 'data', 'streets.json');
      if (fs.existsSync(streetsFile)) {
        const content = fs.readFileSync(streetsFile, 'utf8');
        if (content.trim()) {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      console.log('[Builder] Load streets Fehler:', e.message);
    }
    return [];
  }

  isPositionOnStreet(x, z, streets) {
    for (const street of streets) {
      const dx = street.to.x - street.from.x;
      const dz = street.to.z - street.from.z;
      const totalSteps = Math.max(Math.abs(dx), Math.abs(dz));
      
      for (let step = 0; step <= totalSteps; step++) {
        const progress = step / totalSteps;
        const streetX = Math.round(street.from.x + dx * progress);
        const streetZ = Math.round(street.from.z + dz * progress);
        
        // ✅ 5x1 Breite Prüfung (ox = -2 bis 2)
        for (let ox = -2; ox <= 2; ox++) {
          if (x === streetX + ox && z === streetZ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    console.log(`[Builder] 🏗️ Baue ${templateData.name} bei ${x},${y},${z} (${width}x${height}x${depth})`);
    
    try {
      // ✅ NEUE CHECK: Fundament auf Straßen prüfen
      const streets = this.loadStreets();
      console.log(`[Builder] 🔍 Prüfe Fundament auf bestehende Straßen...`);
      
      let hasConflict = false;
      let conflictPos = null;
      
      for (let fx = x; fx < x + width; fx++) {
        for (let fz = z; fz < z + depth; fz++) {
          if (this.isPositionOnStreet(fx, fz, streets)) {
            console.log(`[Builder] ❌ KONFLIKT: Fundament ${fx},${fz} überschneidet Straße!`);
            hasConflict = true;
            conflictPos = { x: fx, z: fz };
            break;
          }
        }
        if (hasConflict) break;
      }
      
      if (hasConflict) {
        const msg = `Fundament überschneidet bestehende Straße bei ${conflictPos.x},${conflictPos.z}`;
        console.log(`[Builder] ❌ ${msg}`);
        this.bot.chat(`❌ ${msg}`);
        await new Promise(r => setTimeout(r, 1000));
        throw new Error(msg);
      }
      
      console.log(`[Builder] ✅ Fundament-Bereich frei von Straßen`);

      // ✅ FUNDAMENT: Basisfläche
      const foundationBlock = templateData.foundation || 'stone_bricks';
      console.log(`[Builder] 🧱 Fundament ${foundationBlock}`);
      
      for (let fx = x; fx < x + width; fx++) {
        for (let fz = z; fz < z + depth; fz++) {
          this.bot.chat(`/setblock ${fx} ${y} ${fz} ${foundationBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // ✅ WÄNDE: Höhe und Seiten
      const wallBlock = templateData.wall || 'oak_planks';
      console.log(`[Builder] 🧱 Wände ${wallBlock}`);
      
      for (let wy = y + 1; wy < y + height; wy++) {
        // Vorderseite
        for (let wx = x; wx < x + width; wx++) {
          this.bot.chat(`/setblock ${wx} ${wy} ${z} ${wallBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
        // Rückseite
        for (let wx = x; wx < x + width; wx++) {
          this.bot.chat(`/setblock ${wx} ${wy} ${z + depth - 1} ${wallBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
        // Linke Seite
        for (let wz = z + 1; wz < z + depth - 1; wz++) {
          this.bot.chat(`/setblock ${x} ${wy} ${wz} ${wallBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
        // Rechte Seite
        for (let wz = z + 1; wz < z + depth - 1; wz++) {
          this.bot.chat(`/setblock ${x + width - 1} ${wy} ${wz} ${wallBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // ✅ DACH: Oberste Ebene
      const roofBlock = templateData.roof || 'spruce_stairs';
      console.log(`[Builder] 🏠 Dach ${roofBlock}`);
      
      for (let rx = x; rx < x + width; rx++) {
        for (let rz = z; rz < z + depth; rz++) {
          this.bot.chat(`/setblock ${rx} ${y + height} ${rz} ${roofBlock}`);
          await new Promise(r => setTimeout(r, 10));
        }
      }

      // ✅ DETAILS: Fenster, Dekoration
      console.log(`[Builder] 🪟 Details platzieren`);
      if (templateData.details && Array.isArray(templateData.details)) {
        for (const detail of templateData.details) {
          const detailX = x + detail.x;
          const detailY = y + detail.y;
          const detailZ = z + detail.z;
          this.bot.chat(`/setblock ${detailX} ${detailY} ${detailZ} ${detail.block}`);
          await new Promise(r => setTimeout(r, 15));
        }
      }

      // ✅ TÜR: Haupteingang
      console.log(`[Builder] 🚪 Tür bei ${x + (building.doorPos?.x || 8)},${y},${z + (building.doorPos?.z || 0)}`);
      const doorX = x + (building.doorPos?.x || Math.floor(width / 2));
      const doorZ = z + (building.doorPos?.z || 0);
      const doorBlock = templateData.door || 'oak_door';
      
      this.bot.chat(`/setblock ${doorX} ${y + 1} ${doorZ} ${doorBlock}`);
      await new Promise(r => setTimeout(r, 100));
      this.bot.chat(`/setblock ${doorX} ${y + 2} ${doorZ} ${doorBlock}[upper=true]`);
      await new Promise(r => setTimeout(r, 100));

      // ✅ BELEUCHTUNG: Innenlaternen (Optional)
      if (templateData.lights && Array.isArray(templateData.lights)) {
        console.log(`[Builder] 💡 Beleuchtung`);
        for (const light of templateData.lights) {
          const lightX = x + light.x;
          const lightY = y + light.y;
          const lightZ = z + light.z;
          this.bot.chat(`/setblock ${lightX} ${lightY} ${lightZ} lantern`);
          await new Promise(r => setTimeout(r, 15));
        }
      }

      console.log(`[Builder] ✅ GEBÄUDE KOMPLETT! ${width}x${height}x${depth}`);
      return { status: 'success', blocksPlaced: (width * height * depth) + (width * depth) };

    } catch (error) {
      console.error('[Builder] ❌ Build failed:', error.message);
      this.bot.chat(`❌ Build Fehler - ${error.message}`);
      await new Promise(r => setTimeout(r, 1000));
      return { status: 'error', message: error.message };
    }
  }

  async clearArea(building, radius = 2) {
    const { x, y, z, width, depth, height } = building;
    const minX = x - radius;
    const maxX = x + width + radius;
    const minZ = z - radius;
    const maxZ = z + depth + radius;

    console.log(`[Builder] 🧹 Räume Bereich um ${building.name} auf`);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        // Entferne alles über Bodenlevel bis y+6
        for (let cy = y; cy <= y + 6; cy++) {
          this.bot.chat(`/setblock ${cx} ${cy} ${cz} air`);
          await new Promise(r => setTimeout(r, 5));
        }
      }
    }

    console.log(`[Builder] ✅ Bereich geleert`);
  }

  async flattenArea(building, radius = 2) {
    const { x, y, z, width, depth } = building;
    const minX = x - radius;
    const maxX = x + width + radius;
    const minZ = z - radius;
    const maxZ = z + depth + radius;

    console.log(`[Builder] 🪨 Ebne Grundfläche`);

    for (let fx = minX; fx <= maxX; fx++) {
      for (let fz = minZ; fz <= maxZ; fz++) {
        this.bot.chat(`/setblock ${fx} ${y - 1} ${fz} grass_block`);
        await new Promise(r => setTimeout(r, 5));
      }
    }

    console.log(`[Builder] ✅ Fläche geebnet`);
  }
}

module.exports = Builder;
