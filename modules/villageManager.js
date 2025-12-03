const fs = require('fs');
const path = require('path');  // ✅ FEHLTETE IMPORT!

class VillageManager {
  constructor() {
    this.villagesFile = path.join(process.cwd(), 'data', 'villages.json');
    this.villages = this._loadVillages();
    this._ensureDataDir();
  }

  _ensureDataDir() {
    const dataDir = path.dirname(this.villagesFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  _loadVillages() {
    try {
      if (fs.existsSync(this.villagesFile)) {
        const content = fs.readFileSync(this.villagesFile, 'utf8');
        if (content.trim() === '' || content === 'null') return [];
        return JSON.parse(content);
      }
    } catch (e) {
      console.log('[VillageManager] ⚠️ Load Fehler:', e.message);
    }
    return [];
  }

  saveVillages() {
    try {
      fs.writeFileSync(this.villagesFile, JSON.stringify(this.villages, null, 2), 'utf8');
      console.log('[VillageManager] 💾 Dörfer gespeichert');
    } catch (e) {
      console.log('[VillageManager] ❌ Save Fehler:', e.message);
    }
  }

  findOrCreateVillage(centerX, centerY, centerZ) {
    console.log(`[VillageManager] 🏘️ Prüfe Dorf bei (${centerX}, ${centerY}, ${centerZ})`);
    let village = this.villages.find(v =>
      Math.abs(v.centerX - centerX) < v.size &&
      Math.abs(v.centerZ - centerZ) < v.size
    );

    if (!village) {
      village = {
        id: 'village_' + Date.now(),
        centerX, centerY, centerZ,
        size: 100,
        buildings: [],
        maxBuildings: 250
      };
      this.villages.push(village);
      console.log(`[VillageManager] ✨ Neues Dorf: ${village.id}`);
      console.log(`[VillageManager] 📐 Fläche: ${village.size} x ${village.size}`);
      this.saveVillages();
    } else {
      console.log(`[VillageManager] ✅ Dorf existiert: ${village.id}`);
    }
    return village;
  }

  findFreePosition(village, templateWidth, templateDepth, attempts = 50) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const offsetX = (Math.random() - 0.5) * village.size;
      const offsetZ = (Math.random() - 0.5) * village.size;
      const posX = Math.floor(village.centerX + offsetX - templateWidth/2);
      const posZ = Math.floor(village.centerZ + offsetZ - templateDepth/2);

      const collision = village.buildings.some(b =>
        Math.abs(b.x - posX) < (b.width + templateWidth)/2 + 10 &&
        Math.abs(b.z - posZ) < (b.depth + templateDepth)/2 + 10
      );

      if (!collision) {
        console.log(`[VillageManager] ✅ Position bei (${posX}, ${posZ}) nach ${attempt} Versuchen`);
        return { x: posX, z: posZ };
      }

      // Dorf erweitern falls voll
      if (attempt === attempts) {
        village.size += 100;
        console.log(`[VillageManager] 📈 Erweitere Dorf-Fläche: ${village.size - 100} → ${village.size}`);
        this.saveVillages();
        return this.findFreePosition(village, templateWidth, templateDepth);
      }
    }
  }

  addBuildingToVillage(village, building) {
    village.buildings.push(building);
    console.log(`[VillageManager] 🏘️ ${building.name} zu "${village.id}" hinzugefügt (${village.buildings.length}/${village.maxBuildings})`);
    this.saveVillages();
  }

  // ✅ NEU: Für direkte Synchronisation mit StreetBuilder
  getVillages() {
    return this.villages;
  }

  reloadVillages() {
    this.villages = this._loadVillages();
    console.log('[VillageManager] 🔄 Villages reloaded');
  }
}

module.exports = VillageManager;
