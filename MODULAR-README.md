# 🛠️ Builder.js Modular Refactoring

## 📁 Neue Modulstruktur

Die builder.js wurde in mehrere spezialisierte Module aufgeteilt:

```
modules/
├── builder.js          (Hauptdatei - Orchestrierung)
├── constants.js        (✅ NEU) - Alle Konstanten zentral
├── blockUtils.js       (✅ NEU) - Block-Operationen (setzen, Türen, etc.)
├── chunkLoader.js      (✅ NEU) - Chunk-Laden mit +2 Radius
└── [bestehende]
    ├── utils.js
    ├── persistence.js
```

## ✅ Behobene Probleme

### 1. **Block-Fehler bei ungeladenen Chunks** 🔧
```
⚠️ Block deepslate_tiles konnte nicht gesetzt werden bei (-4875, 59, 2541)
```

**Lösung:** `chunkLoader.js` mit CHUNK_LOAD_RADIUS = 4
- Lädt jetzt **+2 Chunks in X und Z Richtung** vor dem Bauen
- Das bedeutet: 4 Chunks Radius um Bauprojekt herum
- Vollständige Chunk-Abdeckung für alle Blockoperationen

### 2. **Füllmaterial aktualisiert** 📦
```javascript
// constants.js
FILL_BLOCK: 'deepslate_tiles'  // ✅ WAS smooth_stone
```

### 3. **Modulare Struktur** 📋
- **constants.js** - Zentrale Verwaltung aller Konstanten
- **blockUtils.js** - Alle Block-Operationen
- **chunkLoader.js** - Intelligentes Chunk-Laden
- **builder.js** - Bleibt Orchestrierungskern

## 🚀 Installation

### Schritt 1: Module in bot/modules/ kopieren

```bash
# Neue Module
cp constants.js bot/modules/
cp blockUtils.js bot/modules/
cp chunkLoader.js bot/modules/
cp builder-new.js bot/modules/builder.js

# Alte sichern
mv bot/modules/builder.js bot/modules/builder.js.old
```

### Schritt 2: Docker neu bauen

```bash
docker-compose down
docker-compose up --build
```

## 🎯 Neue Features

### Chunk-Loader
```javascript
// Automatisch vor dem Bauen aufgerufen
await loadChunksForArea(bot, area);      // Für Gelände
await loadChunksAround(bot, centerX, centerZ); // Für Straßen
```

**Ausgabe:**
```
📦 Lade Chunks um (-4875, 2541) - Chunk (-305, 159)...
  Radius: 4 Chunks in jede Richtung
  Insgesamt 81 Chunks zu laden...
⏳ Warte auf Chunks... 45/81 geladen (Versuch 1/10)
✅ Alle 81 Chunks geladen
```

## 🔍 Verwaltung von Konstanten

Alle Konfigurationen sind jetzt zentral in `constants.js`:

```javascript
const CONSTANTS = {
  FILL_BLOCK: 'deepslate_tiles',      // Material für Unterbau
  ROAD_BLOCK: 'bricks',               // Straßen-Material
  ROAD_WIDTH_STRAIGHT: 2,             // 2 Blöcke breit
  ROAD_WIDTH_DIAGONAL: 4,             // 4 Blöcke breit
  ROAD_OVERLAP: 2,                    // Überlappung
  ROAD_AIR_HEIGHT: 4,                 // Luft über Straßen
  CHUNK_LOAD_RADIUS: 4,               // +2 in jede Richtung
  // ... mehr
};
```

**Änderungen vornehmen:**
```bash
# Edit constants.js
nano modules/constants.js

# Dann neu bauen
docker-compose down && docker-compose up --build
```

## 📊 Verbesserte Block-Operationen

`blockUtils.js` exportiert:
- ✅ `safeSetBlockViaCommand()` - Mit Retry-Logik
- ✅ `detectDoorFacingAttachedOutside()` - Tür-Ausrichtung
- ✅ `canPlaceDoor()` - Platzierungsprüfung
- ✅ `placeDoor()` - Tür setzen
- ✅ `clearPathForDoor()` - Pfad freimachen

## 🐛 Debugging

**Chunks nicht geladen?**
```javascript
// In chunkLoader.js Zeile 15
const CHUNK_LOAD_RADIUS = 4;  // Erhöhen falls nötig (z.B. 5 oder 6)
```

**Blocks immer noch nicht setzbar?**
```bash
# Logs prüfen
docker-compose logs -f minecraft-village-bot | grep "📦 Lade Chunks"
docker-compose logs -f minecraft-village-bot | grep "Block.*konnte nicht"
```

## 📝 Verwendung in Code

**Vor (Monolitisch):**
```javascript
// builder.js war 1000+ Zeilen
const blockUtils = require('./blockUtils');
```

**Jetzt (Modular):**
```javascript
// builder.js nutzt spezialisierte Module
const CONSTANTS = require('./constants');
const blockUtils = require('./blockUtils');
const { loadChunksForArea } = require('./chunkLoader');

// Elegant verwendbar
await blockUtils.safeSetBlockViaCommand(bot, pos, CONSTANTS.FILL_BLOCK);
await loadChunksForArea(bot, area);
```

## ✨ Vorteile dieser Struktur

| Aspekt | Vorteil |
|--------|---------|
| **Wartbarkeit** | Jedes Modul hat eine klare Aufgabe |
| **Wiederverwendbar** | blockUtils in anderen Modules nutzbar |
| **Konfigurierbar** | constants.js für schnelle Anpassungen |
| **Testbar** | Einzelne Module können isoliert getestet werden |
| **Skalierbar** | Leicht erweiterbar (z.B. roadBuilder.js, decorationBuilder.js) |

## 🎉 Das war's!

Der Bot sollte jetzt Blöcke auch in ungeladenen Chunks korrekt setzen können.

Viel Erfolg beim Bauen! 🏗️
