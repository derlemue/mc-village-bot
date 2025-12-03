# 🏗️ MC Village Bot V2

> **Automated Minecraft Village Builder Bot** — Baut ganze Dörfer mit Chat-Befehlen  
> Mineflayer + Docker + Node.js

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org)
[![Minecraft Version](https://img.shields.io/badge/Minecraft-1.20.1-brightgreen)](https://www.minecraft.net)
[![Status](https://img.shields.io/badge/Status-Active%20Development-blue)](#)

## 🎯 Was macht der Bot?

MC Village Bot V2 ist ein vollautomatisierter **Minecraft-Dorf-Konstruktor**, der komplexe Dörfer mit verschiedenen Gebäuden, Straßen und Terraforming aus **WorldEdit-Schematics** (.schem Dateien) erstellt.

**Kernfunktionen:**
- ✅ **Automatisches Terraforming** — Ebnet Terrain, erstellt Fundamente
- ✅ **Schematic-Verarbeitung** — Konvertiert .schem → JavaScript-Schematics
- ✅ **Gebäude-Konstruktion** — Platziert Gebäude mit Pathfinding
- ✅ **Straßen & Dekoration** — Erstellt Wege und Beleuchtung (Laternen)
- ✅ **Dorf-Management** — Koordiniert mehrere Gebäude
- ✅ **Discord-Integration** — Status-Updates via Webhook
- ✅ **Docker-Ready** — Production-ready mit Docker Compose
- ✅ **Chat-Steuerung** — Einfache Minecraft-Chat-Befehle

---

## 📋 Voraussetzungen

### System
- **Node.js** 16.x oder höher
- **npm** oder **yarn**
- **Docker** + **Docker Compose** (optional, empfohlen)
- **Minecraft Server** 1.20.1 (Vanilla oder compatible)

### Minecraft Setup
- Bot-Account mit Zugriff auf den Server
- Schematics (.schem Dateien) im `schematics/` Ordner
- Genug Platz für Gebäude und Terraforming

---

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

Erstelle eine `.env` Datei im Projektverzeichnis:

```env
# Minecraft Server
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=VillageBot
MC_PASSWORD=offline

# Server-Administration
ADMIN_UUID=dein-uuid-hier
RENDER_DISTANCE=8
VIEW_DISTANCE=10

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy

# Logging
LOG_LEVEL=info
DEBUG=false
```

**Wichtige Variablen:**
- `MC_HOST`: IP oder Hostname des Minecraft-Servers
- `MC_PORT`: Port des Servers (default: 25565)
- `MC_USERNAME`: Name des Bot-Accounts
- `MC_PASSWORD`: Passwort (bei offline-mode: beliebig)
- `DISCORD_WEBHOOK_URL`: Optional für Status-Meldungen

### 4. Bot starten (lokal)

```bash
npm start
```

Oder im Development-Modus mit auto-reload:

```bash
npm run dev
```

Der Bot verbindet sich zum Server und gibt Meldungen in der Konsole aus.

---

## 📡 Chat-Befehle

Der Bot reagiert auf Chat-Nachrichten mit folgendem Format:

### Syntax

```
!build <gebäude-name> <x> <z>
!terrain <x1> <z1> <x2> <z2>
!streets <x1> <z1> <x2> <z2>
!village <x> <z>
!status
```

### Beispiele

**Einzelnes Gebäude platzieren:**
```
!build house_1 100 100
```

**Terrain ebnen (rechteck von [100,100] bis [200,200]):**
```
!terrain 100 100 200 200
```

**Straßen bauen:**
```
!streets 100 100 200 200
```

**Ganzes Dorf erstellen:**
```
!village 100 100
```

**Status abrufen:**
```
!status
```

---

## 🏗️ Architektur & Module

MC Village Bot V2 ist modular aufgebaut für einfache Wartung und Erweiterung:

```
mc-village-bot/
├── src/
│   ├── bot.js              # Haupteinstiegspunkt, Chat-Handler
│   ├── config.js           # Konfiguration & Umgebungsvariablen
│   ├── logger.js           # Logging-System
│   ├── modules/
│   │   ├── terrain.js      # Terraforming
│   │   ├── streets.js      # Straßenbau
│   │   ├── builder.js      # Gebäude-Konstruktion
│   │   └── villageManager.js # Dorf-Verwaltung
│   ├── utils/
│   │   ├── schematicLoader.js # .schem → JS Konvertierung
│   │   ├── pathfinding.js    # A* Pathfinding
│   │   └── helpers.js        # Hilfsfunktionen
│   └── discord/
│       └── webhooks.js     # Discord-Integration
├── schematics/             # WorldEdit .schem Dateien
│   ├── house_1.schem
│   ├── house_2.schem
│   └── ...
├── .env                    # Umgebungsvariablen
├── docker-compose.yml      # Docker-Konfiguration
├── Dockerfile              # Container-Image
├── package.json
└── README.md
```

---

## 🔧 Module-Übersicht

### terrain.js - Terrain-Vorbereitung

Ebnet und bereitet Terrain vor:

- **`flatTerrain(x, z, width, height, height_level)`** — Erstellt ebene Fläche
- **`createFoundation(x, z, width, height)`** — Stellt Fundament bereit
- **`smoothTerrain(x, z, radius)`** — Glättet Übergänge

```javascript
const { flatTerrain } = require('./modules/terrain');
await flatTerrain(bot, 100, 100, 50, 50, 65);
```

### streets.js - Straßen & Laternen

Erstellt Straßen und Beleuchtung:

- **`buildStreet(x, z, direction, length, width)`** — Straße bauen
- **`placeStreetLights(x, z, spacing)`** — Laternen platzieren
- **`createRoad(x1, z1, x2, z2)`** — Direkte Verbindung

```javascript
const { buildStreet, placeStreetLights } = require('./modules/streets');
await buildStreet(bot, 100, 100, 'north', 50, 5);
await placeStreetLights(bot, 100, 100, 5);
```

### builder.js - Gebäude-Konstruktion

Platziert Gebäude aus Schematics:

- **`placeSchematic(x, y, z, schematicData)`** — Schematic platzieren
- **`buildStructure(name, x, z)`** — Gebäude mit Name laden & bauen
- **`isAreaClear(x, z, width, height)`** — Prüft ob Platz frei ist

```javascript
const { buildStructure } = require('./modules/builder');
await buildStructure(bot, 'house_1', 100, 100);
```

### villageManager.js - Dorf-Verwaltung

Koordiniert komplette Dörfer:

- **`planVillage(x, z, config)`** — Plant Dorf-Layout
- **`buildVillage(x, z)`** — Baut ganzes Dorf
- **`calculateSpacing(num_buildings, area_width)`** — Berechnet Abstände

```javascript
const { buildVillage } = require('./modules/villageManager');
await buildVillage(bot, 100, 100, {
  buildings: ['house_1', 'house_2', 'farm'],
  spacing: 20
});
```

---

## 🏗️ Workflow: So läuft der Bau ab

```
1. Chat-Befehl empfangen
   └─> "!build house_1 100 100"

2. Befehl parsen
   └─> Gebäude: "house_1", Position: (100, 100)

3. Schematic laden
   └─> house_1.schem → JavaScript-Daten

4. Terrain vorbereiten
   ├─> Fläche ebnen
   └─> Fundament erstellen

5. Gebäude bauen
   ├─> Block für Block platzieren
   ├─> Pathfinding zur nächsten Position
   └─> Status-Updates senden

6. Dekoration
   ├─> Straßen
   └─> Laternen

7. Fertig-Meldung
   └─> Discord Webhook (optional)
```

---

## ⚙️ Template-Struktur

Schematics (.schem Dateien) werden in JavaScript-Objects konvertiert:

```javascript
{
  version: 3,
  width: 16,
  height: 12,
  length: 16,
  blocks: [
    { x: 0, y: 0, z: 0, name: 'minecraft:oak_log' },
    { x: 1, y: 0, z: 0, name: 'minecraft:oak_log' },
    // ... weitere Blöcke
  ],
  entities: [
    { x: 8, y: 2, z: 8, type: 'minecraft:item_frame', data: {...} }
  ]
}
```

**Schematic konvertieren (Python):**

```bash
python3 utils/schem_to_js.py schematics/house_1.schem > house_1.js
```

---

## 🐳 Docker Betrieb

### Mit Docker Compose starten

```bash
docker-compose up -d
```

Bot läuft jetzt im Hintergrund. Logs ansehen:

```bash
docker-compose logs -f bot
```

Bot stoppen:

```bash
docker-compose down
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  bot:
    build: .
    container_name: mc-village-bot
    environment:
      MC_HOST: minecraft-server
      MC_PORT: 25565
      MC_USERNAME: VillageBot
      MC_PASSWORD: offline
      DISCORD_WEBHOOK_URL: ${DISCORD_WEBHOOK_URL}
      LOG_LEVEL: info
    volumes:
      - ./schematics:/app/schematics
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - minecraft

networks:
  minecraft:
    driver: bridge
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY schematics ./schematics
COPY .env .env

CMD ["node", "src/bot.js"]
```

---

## 📊 Persistent Storage

Bot speichert Daten in Volumes:

- **`schematics/`** — WorldEdit .schem Dateien
- **`logs/`** — Bot-Logs (optional)
- **`.env`** — Konfiguration

**Schematics hinzufügen:**

1. Schematic in Minecraft erstellen (WorldEdit)
2. In `schematics/` folder speichern
3. Mit Python konvertieren:
   ```bash
   python3 utils/schem_to_js.py schematics/new_building.schem
   ```
4. Bot neustarten oder Schematic im Chat laden

---

## 🔧 Troubleshooting

### Bot verbindet sich nicht zum Server

**Problem:** `ECONNREFUSED` oder `Connection timeout`

**Lösung:**
1. Server-IP/Port prüfen (`.env`):
   ```bash
   MC_HOST=mein-server.de
   MC_PORT=25565
   ```
2. Firewall prüfen — Port muss offen sein
3. Bot-Account prüfen — Name/Passwort korrekt?
4. Server-Logs prüfen:
   ```bash
   docker-compose logs minecraft-server
   ```

### Bot bleibt hängen / Bau läuft nicht

**Problem:** Bot verbunden, aber keine Befehle ausgeführt

**Lösung:**
1. Logs ansehen:
   ```bash
   docker-compose logs -f bot
   ```
2. Render Distance prüfen (muss ≥8 sein)
3. Admin-UUID prüfen (nur Admins dürfen Befehle senden)
4. Fehlermeldungen googlen oder Issue erstellen

### Gebäude wird nicht platziert

**Problem:** `!build house_1 100 100` tut nichts

**Lösung:**
1. Schematic vorhanden?
   ```bash
   ls schematics/
   ```
2. Konvertiert zu .js?
   ```bash
   ls src/templates/
   ```
3. Fläche zu klein? Gebäude braucht Platz
4. Y-Koordinate zu hoch? Muss passende Höhe sein

### "Position konnte nicht gefunden werden" - Dorf voll

**Problem:** Bot kann kein freies Feld finden

**Lösung:**
- Größerer Radius für `!village`
- Alte Gebäude demolieren/verschieben
- Chunks unloaden und neu laden

### Docker Container läuft, aber Bot sendet keine Chats

**Problem:** Container active, aber Bot antwortet nicht

**Lösung:**
1. Container-Logs prüfen:
   ```bash
   docker-compose logs bot
   ```
2. Network prüfen:
   ```bash
   docker network ls
   docker-compose exec bot ping minecraft-server
   ```
3. Env-Variablen checken:
   ```bash
   docker-compose config
   ```
4. Container neustarten:
   ```bash
   docker-compose restart bot
   ```

---

## 📝 Development & Änderungen

### Neues Template hinzufügen

1. **WorldEdit-Schematic erstellen** in Minecraft
2. **Exportieren**: `/schem save house_3`
3. **In Projekt kopieren**:
   ```bash
   cp house_3.schem schematics/
   ```
4. **Konvertieren** (falls Python-Skript vorhanden):
   ```bash
   python3 utils/schem_to_js.py schematics/house_3.schem > src/templates/house_3.js
   ```
5. **Im Bot registrieren** (in builder.js oder villageManager.js)
6. **Testen**:
   ```bash
   !build house_3 100 100
   ```

### Code-Änderungen für lokale Tests

```bash
# Dev-Modus mit auto-reload
npm run dev

# Oder manuell neustarten nach Änderungen
npm start
```

**Best Practices:**
- Änderungen in `src/` testen, bevor Docker gepusht wird
- Neue Features als Commits auf `develop` branch
- Pull Requests für größere Features
- Logs mit `logger.debug()` hinzufügen

---

## 📄 Lizenzen & Attributionen

- **MC Village Bot** — MIT License
- **Mineflayer** — MIT License (Bot-Framework)
- **WorldEdit** — GNU GPL v3 (Schematic-Format)

---

## 📧 Support & Dokumentation

**Repository:** https://github.com/derlemue/mc-village-bot

**Issues & Fragen:**
- 🐛 Bugs: [GitHub Issues](https://github.com/derlemue/mc-village-bot/issues)
- 💬 Diskussionen: [GitHub Discussions](https://github.com/derlemue/mc-village-bot/discussions)
- 📋 Logs prüfen: `docker-compose logs bot`

**Nützliche Links:**
- [Mineflayer Dokumentation](https://github.com/PrismarineJS/mineflayer)
- [Minecraft Wiki](https://minecraft.wiki)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

**Version:** V2  
**Status:** 🟢 Active Development  
**Letztes Update:** 2025-12-03  
**Node.js:** 16+  
**Minecraft:** 1.20.1  
**Betrieb:** Docker Compose + Mineflayer
