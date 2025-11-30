# MC Village Bot V2

Ein **Minecraft-Bot in Node.js** (Mineflayer-basiert) zum vollautomatischen Erstellen von Dörfern mit konfigurierbaren Template-Gebäuden, intelligenten Straßenlayouts und automatischer Terrain-Vorbereitung. Der Bot verbindet sich direkt mit einem Minecraft-Server (Version 1.20.1) und wird via **Docker Compose** bereitgestellt.

## 🎯 Was macht der Bot?

Der Bot führt folgende Aufgaben automatisch durch:

1. **Terrain-Vorbereitung** - Flacht Gelände ab und freiräumt die Fläche über der kompletten Fundament-Grundfläche
2. **Fundament-Bau** - Erstellt Fundamente aus Deepslate Tiles (10-40 Blöcke größer als Gebäude)
3. **Gebäude-Konstruktion** - Platziert vordefinierte Gebäude-Templates (Kneipe, Stadium, Schloss, etc.)
4. **Straßen-Verbindung** - Baut automatisch Straßen zwischen Gebäuden mit Laternen
5. **Dorf-Verwaltung** - Speichert Dorf-Struktur lokal, verwaltet Gebäude-Positionen, verhindert Überlappungen
6. **Bewegungsmanagement** - Teleportiert den Bot und navigiert über Terrain

Steuerung erfolgt über **In-Game Chat-Befehle**:
```
!build <x> <y> <z> [template] [count]
!stop
!templates
```

## 📋 Voraussetzungen

- **Node.js 16+** und **npm**
- **Minecraft Server** (1.20.1) auf dem Bot verbindbar ist
- **Docker & Docker Compose** (für containerisierten Betrieb)
- Minecraft **Account** (Microsoft/Mojang-Auth)
- `.env` Datei mit Server-Credentials

## 🚀 Schnellstart

### 1. Repository klonen

```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

Erstelle `.env` Datei im Projektverzeichnis (Basis: `.env.example`):

```env
# Minecraft Server
MC_HOST=46.224.3.29          # Server-IP oder Hostname
MC_PORT=25565                # Minecraft Server Port
MC_USERNAME=YourUsername     # Bot-Kontoname
MC_VERSION=1.20.1            # Minecraft Version
MC_AUTH=microsoft            # Auth-Type: microsoft oder mojang
```

### 4. Bot starten (lokal)

```bash
npm start
```

Oder mit Docker Compose:

```bash
docker-compose up -d
```

## 📡 Chat-Befehle

Die folgenden Befehle funktionieren im Minecraft-Chat (als Admin/Spieler):

| Befehl | Beispiel | Beschreibung |
|--------|----------|-------------|
| `!build` | `!build 100 64 200 kneipe 5` | Baut 5x Kneipe bei (100, 64, 200) |
| `!build` | `!build 100 64 200 stadium 1` | Baut 1x Stadium bei Koordinaten |
| `!build` | `!build 100 64 200` | Baut 1x Kneipe (default) |
| `!stop` | `!stop` | Stoppt aktuellen Bau sofort |
| `!templates` | `!templates` | Zeigt alle verfügbaren Template-Namen |

### Syntax

```
!build <x> <y> <z> [template] [count]
```

- **`<x> <y> <z>`** - Startkoordinaten (x horizontal, z depth, y height)
- **`[template]`** - Optional: kneipe, stadium, schloss (Standard: kneipe)
- **`[count]`** - Optional: Anzahl Gebäude (Standard: 1)

### Beispiele

```
!build 100 64 200 kneipe 3    # 3x Kneipe bauen
!build 50 70 100 stadium 2    # 2x Stadium bauen
!build 0 64 0                 # 1x Kneipe bei (0, 64, 0)
!stop                          # Bau stoppen
!templates                     # Verfügbare Gebäude anzeigen
```

## 🏗️ Architektur & Module

```
mc-village-bot/
├── index.js                  # Haupteinstiegspunkt (Mineflayer Setup)
├── package.json              # Node.js Dependencies
├── docker-compose.yml        # Docker Compose Config
├── Dockerfile                # Docker Image Definition
├── .env.example             # Umgebungsvariablen Template
│
├── modules/
│   ├── terrain.js           # Terrain-Vorbereitung
│   ├── streets.js           # Straßen & Laternen
│   ├── builder.js           # Gebäude-Konstruktion
│   ├── movement.js          # Bot-Bewegung & Teleport
│   ├── villageManager.js    # Dorf-Verwaltung (JSON-Persistierung)
│   ├── templateLoader.js    # Template-Loading
│   └── persistence.js       # Datenspeicherung
│
├── templates/
│   ├── kneipe.js            # Kneipe-Template (9x10x8)
│   ├── stadium.js           # Stadium-Template (25x25x8)
│   ├── schloss.js           # Schloss-Template
│   └── ...                  # Weitere Templates
│
├── data/
│   └── villages.json        # Persistierte Dorf-Struktur
│
└── schematics/              # Optional: .schematic Dateien
```

## 🔧 Module-Übersicht

### `terrain.js` - Terrain-Vorbereitung

```javascript
const terrain = new TerrainPreparer(bot);

// Vorbereitung für Gebäude
await terrain.prepareBuildingArea({
  x: 100, y: 64, z: 200,
  width: 9, depth: 10
});
```

**Funktionalität:**
- Berechnet Fundament-Größe (zufällig +10 bis +40 Blöcke)
- Baut Deepslate Tiles von y=61 bis Gebäude-Y
- **Räumt Luft über GESAMTE Fundament-Fläche frei** (y bis y+128)
- Mit Progress-Logging

### `streets.js` - Straßen & Laternen

```javascript
const streets = new StreetBuilder(bot);

// Straße zwischen zwei Gebäuden
await streets.buildStreetToBuilding(64, building1, building2);

// Laternenpfähle um Gebäude
await streets.buildLanternPosts(64, building);
```

### `builder.js` - Gebäude-Konstruktion

```javascript
const builder = new Builder(bot);

// Gebäude bauen
const result = await builder.buildBuilding(building, templateData);
// → {status: 'success', blocksPlaced: 2450, time: 145000}
```

### `villageManager.js` - Dorf-Verwaltung

```javascript
const manager = new VillageManager();

// Dorf finden oder erstellen
const village = manager.findOrCreateVillage(100, 64, 200);

// Freie Position für nächstes Gebäude finden
const pos = manager.findFreePosition(village, width, depth);
// → {x: 110, z: 205}

// Gebäude zur Dorf-Liste hinzufügen
manager.addBuildingToVillage(village, building);
```

**Persistierung:** `data/villages.json`

## 🏗️ Workflow: So läuft der Bau ab

```
Chat: !build 100 64 200 stadium 2
    ↓
Bot:  ✅ LOGIN
Bot:  ✅ SPAWNED
Bot:  🎮 Bereit!
    ↓
[1] Dorf-Verwaltung
    └─ Dorf finden oder erstellen (Fläche 100x100)
    └─ Freie Position #1 berechnen
    
[2] Bewegung
    └─ Teleportieren zu (100, 84, 200)  # y+20 für Clearance
    └─ Weg räumen (GLOBAL_IS_BUILDING=true)
    
[3] Terrain-Vorbereitung
    └─ Fundament-Größe: random 10-40 Blöcke Puffer
    └─ Deepslate Tiles von y=61 bis y=64
    └─ Sky-Bereich über GESAMTE Fundament-Fläche räumen
    
[4] Gebäude-Bau
    └─ Stadium platzieren (25x25x8)
    
[5] Infrastruktur (ab Gebäude #2)
    └─ Straße vom vorherigen Gebäude
    └─ Laternenpfähle
    
[6] Zurückbewegung (für nächstes Gebäude)
    └─ Movement zurück zur Startposition
    
[7] Wiederholung bis count erreicht
    └─ !build 100 64 200 stadium 2 → 2x durchlaufen
    
Chat: 🎉 2/2 fertig!
```

## ⚙️ Template-Struktur

Templates definieren das Aussehen von Gebäuden:

```javascript
// modules/templates/kneipe.js
module.exports = {
  name: 'Kneipe',
  width: 9,
  height: 8,
  depth: 10,
  foundation: 'stone_bricks',
  foundationHeight: 1,
  walls: 'oak_log',
  roof: 'dark_oak_wood',
  doorPos: { x: 4, z: 0 },
  details: [
    { x: 2, y: 1, z: 2, block: 'oak_door' },
    { x: 7, y: 1, z: 2, block: 'barrel' },
    { x: 4, y: 1, z: 8, block: 'lantern' }
  ]
};
```

**Deine verfügbaren Templates:**
- `kneipe` - 9x10x8 Gasthof
- `stadium` - 25x25x8 Sportplatz
- `schloss` - Schloss-Gebäude

## 🐳 Docker Betrieb

### Mit Docker Compose starten

```bash
# Container im Hintergrund starten
docker-compose up -d

# Logs anschauen (live)
docker-compose logs -f

# Container stoppen
docker-compose stop

# Container neu starten
docker-compose restart

# Container löschen (Daten bleiben in Volumes)
docker-compose down
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  minecraft-village-bot:
    build: .
    container_name: minecraft-village-bot
    restart: unless-stopped
    environment:
      - MC_HOST=46.224.3.29
      - MC_PORT=25565
      - MC_USERNAME=cr4zy_chicken
      - MC_VERSION=1.20.1
      - MC_AUTH=microsoft
    volumes:
      - ./data:/app/data              # Dorf-Persistierung
      - ./schematics:/app/schematics  # Schematic-Dateien (readonly)
      - ./.env:/app/.env:ro           # Secrets mounten
    stdin_open: true
    tty: true
```

**Wichtig:** 
- `.env` wird als Read-Only in Container gemountet
- `data/` Verzeichnis speichert `villages.json`
- `schematics/` für zukünftige Erweiterungen

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

CMD ["npm", "start"]
```

## 📊 Persistent Storage

Der Bot speichert Dorf-Strukturen lokal in `data/villages.json`:

```json
[
  {
    "id": "village_1732878000000",
    "centerX": 100,
    "centerY": 64,
    "centerZ": 200,
    "size": 100,
    "buildings": [
      {
        "x": 110,
        "y": 64,
        "z": 205,
        "width": 25,
        "height": 8,
        "depth": 25,
        "name": "Stadium #1",
        "doorPos": { "x": 12, "z": 0 }
      }
    ],
    "maxBuildings": 150
  }
]
```

Bei erneutem Start mit gleichen Koordinaten wird das existierende Dorf erweitert (nicht überschrieben).

## 🔧 Troubleshooting

### Bot verbindet sich nicht zum Server

**Fehler in Logs:**
```
[BOT] ❌ ERROR: getaddrinfo ENOTFOUND 46.224.3.29
```

**Lösung:**
1. **`.env` prüfen:**
```bash
cat .env
```
Sollte enthalten: `MC_HOST`, `MC_PORT`, `MC_USERNAME`

2. **Server-Erreichbarkeit testen:**
```bash
ping 46.224.3.29
# oder
nc -zv 46.224.3.29 25565
```

3. **Minecraft Version prüfen:**
```env
MC_VERSION=1.20.1    # Muss exakt passen!
```

### Bot bleibt hängen / Bau läuft nicht

**Ursache:** `GLOBAL_IS_BUILDING` ist noch `true`

**Lösung:**
```
!stop
```

Oder im Terminal:
```bash
docker exec minecraft-village-bot kill -9 node
```

### Gebäude wird nicht platziert

**Ursache:** Template nicht gefunden

**Lösung:** Verfügbare Templates anschauen
```
!templates
# Output: Templates: kneipe, stadium, schloss
```

**Oder:** Template-Datei überprüfen
```bash
ls modules/templates/
# Sollte kneipe.js, stadium.js, schloss.js enthalten
```

### "Position konnte nicht gefunden werden" - Dorf voll

**Ursache:** Alle Positionen belegt

**Lösung:** Dorf wird automatisch erweitert (siehe `villageManager.js`)
- Start-Größe: 100x100
- Erweitert um 100x100 nach Bedarf (automatisch)

### Docker Container läuft, aber Bot sendet keine Chats

**Ursache:** Bot hat keine Chat-Berechtigung oder ist nicht spawned

**Lösung:**
```bash
# Logs anschauen
docker-compose logs -f

# Sollte zeigen:
# [BOT] ✅ LOGIN
# [BOT] ✅ SPAWNED
# [BOT] 🎮 Bereit!
```

## 📝 Development & Änderungen

### Neues Template hinzufügen

1. Datei erstellen: `modules/templates/meingebaeude.js`

```javascript
module.exports = {
  name: 'Mein Gebäude',
  width: 12,
  height: 8,
  depth: 12,
  foundation: 'stone_bricks',
  walls: 'dark_oak_log',
  roof: 'dark_oak_planks',
  doorPos: { x: 6, z: 0 },
  details: [
    { x: 5, y: 1, z: 0, block: 'oak_door' },
    { x: 6, y: 1, z: 0, block: 'oak_door' },
  ]
};
```

2. In `templateLoader.js` registrieren (falls nötig)

3. Verwenden:
```
!build 100 64 200 meingebaeude 1
```

### Code-Änderungen für lokale Tests

```bash
# Abhängigkeiten installieren
npm install

# Lokal starten
npm start

# Mit Node-Debugger
node --inspect index.js
```

## 📄 Lizenzen & Attributionen

- **Mineflayer** - NPM Package für Minecraft-Bot-Entwicklung
- **Node.js** - Runtime
- **dotenv** - Umgebungsvariablen-Management

## 📧 Support & Dokumentation

**Repository:** https://github.com/derlemue/mc-village-bot

**Issues & Fragen:**
- GitHub Issues: Bugs, Feature Requests
- Logs prüfen: `docker-compose logs`

---

**Version**: V2  
**Status**: Aktive Entwicklung  
**Letztes Update**: 2025-11-30  
**Node.js**: 16+  
**Minecraft**: 1.20.1  
**Betrieb**: Docker Compose + Mineflayer
