const fs = require('fs');
const path = require('path');

class Persistence {
  constructor() {
    this.buildingsFile = path.join(process.cwd(), 'data', 'buildings.json');
    this._ensureDataDir();
  }

  _ensureDataDir() {
    const dataDir = path.dirname(this.buildingsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  loadBuildings() {
    try {
      if (fs.existsSync(this.buildingsFile)) {
        const content = fs.readFileSync(this.buildingsFile, 'utf8');
        if (content.trim() === '' || content === 'null') return [];
        return JSON.parse(content);
      }
    } catch (e) {
      console.log('[Persistence] ⚠️ Load Fehler:', e.message);
    }
    return [];
  }

  saveBuildings(buildings) {
    try {
      fs.writeFileSync(this.buildingsFile, JSON.stringify(buildings, null, 2), 'utf8');
      console.log('[Persistence] 💾 Buildings gespeichert');
    } catch (e) {
      console.log('[Persistence] ❌ Save Fehler:', e.message);
    }
  }
}

module.exports = Persistence;
