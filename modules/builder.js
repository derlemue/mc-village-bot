// builder.js - OPTIMIZED WITH /FILL COMMANDS

const fs = require('fs');
const path = require('path');
const CommandHelper = require('./commandHelper');

class Builder {
  constructor(bot) {
    this.bot = bot;
    this.commandHelper = new CommandHelper(bot);
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

        // ✅ 5x1 Breite Prüfung
        for (let ox = -2; ox <= 2; ox++) {
          if (x === streetX + ox && z === streetZ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ✅ NEU: Findet freie Position ohne Straßen-Konflikt
  findValidBuildingPosition(village, templateData, streets, maxAttempts = 100) {
    console.log(`[Builder] 🔍 Suche valide Position ohne Straßen-Konflikt...`);
    const width = templateData.width || 16;
    const depth = templateData.depth || 16;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const offsetX = (Math.random() - 0.5) * village.size;
      const offsetZ = (Math.random() - 0.5) * village.size;
      const posX = Math.floor(village.centerX + offsetX - width / 2);
      const posZ = Math.floor(village.centerZ + offsetZ - depth / 2);

      // ✅ Prüfe Gebäude-Kollisionen
      const buildingCollision = village.buildings.some(b =>
        Math.abs(b.x - posX) < (b.width + width) / 2 + 10 &&
        Math.abs(b.z - posZ) < (b.depth + depth) / 2 + 10
      );
      if (buildingCollision) {
        continue;
      }

      // ✅ KRITISCH: Prüfe Straßen-Kollisionen für GESAMTES Fundament
      let hasStreetConflict = false;
      for (let fx = posX; fx < posX + width; fx++) {
        for (let fz = posZ; fz < posZ + depth; fz++) {
          if (this.isPositionOnStreet(fx, fz, streets)) {
            console.log(`[Builder] ⚠️ Position ${posX},${posZ} hat Straße bei ${fx},${fz}`);
            hasStreetConflict = true;
            break;
          }
        }
        if (hasStreetConflict) break;
      }

      if (hasStreetConflict) {
        continue;
      }

      console.log(`[Builder] ✅ Valide Position gefunden: ${posX},${posZ} nach ${attempt + 1} Versuchen`);
      return { x: posX, z: posZ };
    }

    console.log(`[Builder] ❌ Keine valide Position nach ${maxAttempts} Versuchen!`);
    return null;
  }

  getDoorFacing(doorX, doorZ, x, z, width, depth) {
    if (doorZ === z) return 'north';
    if (doorZ === z + depth - 1) return 'south';
    if (doorX === x) return 'west';
    if (doorX === x + width - 1) return 'east';
    return 'north';
  }

  async buildBuilding(building, templateData) {
    const { x, y, z, width, depth, height } = building;
    console.log(`[Builder] 🏗️ Baue ${templateData.name} bei ${x},${y},${z} (${width}x${height}x${depth})`);

    try {
      // ✅ KRITISCH CHECK: Fundament DARF KEINE STRAßEN ÜBERBAUEN
      const streets = this.loadStreets();
      console.log(`[Builder] 🔍 Prüfe Fundament auf bestehende Straßen...`);
      let hasConflict = false;
      let conflictPos = null;

      // ✅ GESAMTES Fundament prüfen
      for (let fx = x; fx < x + width; fx++) {
        for (let fz = z; fz < z + depth; fz++) {
          if (this.isPositionOnStreet(fx, fz, streets)) {
            console.log(`[Builder] ❌ KONFLIKT: Fundament-Block ${fx},${fz} liegt auf Straße!`);
            hasConflict = true;
            conflictPos = { x: fx, z: fz };
            break;
          }
        }
        if (hasConflict) break;
      }

      if (hasConflict) {
        const msg = `❌ POSITION UNGÜLTIG: Fundament überschneidet Straße bei ${conflictPos.x},${conflictPos.z}. Bitte andere Position wählen.`;
        console.log(`[Builder] ${msg}`);
        // this.bot.chat(msg); // Silenced by user request
        await new Promise(r => setTimeout(r, 1000));
        return { status: 'error', message: msg };
      }

      console.log(`[Builder] ✅ Fundament-Bereich FREI von Straßen`);

      // ✅ FUNDAMENT: Basisfläche (/fill)
      const foundationBlock = templateData.foundation || 'stone_bricks';
      console.log(`[Builder] 🧱 Fundament ${foundationBlock}`);
      await this.commandHelper.fill(x, y, z, x + width - 1, y, z + depth - 1, foundationBlock);

      // ✅ WÄNDE: Höhe und Seiten (/fill)
      const wallBlock = templateData.wall || 'oak_planks';
      console.log(`[Builder] 🧱 Wände ${wallBlock}`);
      const wallEndY = y + height - 1;

      // Wall 1 (Back)
      await this.commandHelper.fill(x, y + 1, z, x + width - 1, wallEndY, z, wallBlock); // Front? z
      // Wall 2 (Front)
      await this.commandHelper.fill(x, y + 1, z + depth - 1, x + width - 1, wallEndY, z + depth - 1, wallBlock);
      // Wall 3 (Left)
      await this.commandHelper.fill(x, y + 1, z + 1, x, wallEndY, z + depth - 2, wallBlock);
      // Wall 4 (Right)
      await this.commandHelper.fill(x + width - 1, y + 1, z + 1, x + width - 1, wallEndY, z + depth - 2, wallBlock);

      // ✅ DACH: Oberste Ebene (/fill)
      const roofBlock = templateData.roof || 'spruce_stairs';
      console.log(`[Builder] 🏠 Dach ${roofBlock}`);
      await this.commandHelper.fill(x, y + height, z, x + width - 1, y + height, z + depth - 1, roofBlock);

      // ✅ DETAILS: Fenster, Dekoration (Muss weiterhin einzeln sein, da spezifische Positionen)
      console.log(`[Builder] 🪟 Details platzieren`);
      if (templateData.details && Array.isArray(templateData.details)) {
        for (const detail of templateData.details) {
          const detailX = x + detail.x;
          const detailY = y + detail.y;
          const detailZ = z + detail.z;
          this.bot.chat(`/setblock ${detailX} ${detailY} ${detailZ} ${detail.block}`);
          await new Promise(r => setTimeout(r, 10)); // Faster 10ms
        }
      }

      // ✅ TÜR: Haupteingang with CORRECT STATE
      console.log(`[Builder] 🚪 Tür bei ${x + (building.doorPos?.x || 8)},${y},${z + (building.doorPos?.z || 0)}`);
      const doorX = x + (building.doorPos?.x || Math.floor(width / 2));
      const doorZ = z + (building.doorPos?.z || 0);
      const doorBlock = templateData.door || 'oak_door';

      const facing = this.getDoorFacing(doorX, doorZ, x, z, width, depth);
      console.log(`[Builder] 🚪 Richtung: ${facing}`);

      // Update calls to use [half=lower/upper,facing=X]
      this.bot.chat(`/setblock ${doorX} ${y + 1} ${doorZ} ${doorBlock}[half=lower,facing=${facing}]`);
      await new Promise(r => setTimeout(r, 50));
      this.bot.chat(`/setblock ${doorX} ${y + 2} ${doorZ} ${doorBlock}[half=upper,facing=${facing}]`);
      await new Promise(r => setTimeout(r, 50));

      // ✅ BELEUCHTUNG: Innenlaternen (Optional)
      if (templateData.lights && Array.isArray(templateData.lights)) {
        console.log(`[Builder] 💡 Beleuchtung`);
        for (const light of templateData.lights) {
          const lightX = x + light.x;
          const lightY = y + light.y;
          const lightZ = z + light.z;
          this.bot.chat(`/setblock ${lightX} ${lightY} ${lightZ} lantern`);
          await new Promise(r => setTimeout(r, 10));
        }
      }

      console.log(`[Builder] ✅ GEBÄUDE KOMPLETT! ${width}x${height}x${depth}`);
      return { status: 'success', blocksPlaced: (width * height * depth) + (width * depth) };

    } catch (error) {
      console.error('[Builder] ❌ Build failed:', error.message);
      console.log(`[Bot] ❌ Build Fehler - ${error.message}`);
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
    console.log(`[Builder] 🧹 Räume Bereich um ${building.name} auf...`);

    // Use fill for air
    await this.commandHelper.fill(minX, y, minZ, maxX, y + 6, maxZ, 'air');

    console.log(`[Builder] ✅ Bereich geleert`);
  }

  async flattenArea(building, radius = 2) {
    const { x, y, z, width, depth } = building;
    const minX = x - radius;
    const maxX = x + width + radius;
    const minZ = z - radius;
    const maxZ = z + depth + radius;
    console.log(`[Builder] 🪨 Ebne Grundfläche`);

    // Use fill for grass
    await this.commandHelper.fill(minX, y - 1, minZ, maxX, y - 1, maxZ, 'grass_block');

    console.log(`[Builder] ✅ Fläche geebnet`);
  }
}

module.exports = Builder;
