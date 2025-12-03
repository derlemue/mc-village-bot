# 🏗️ MC Village Bot - Automated Minecraft Village Builder

![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![Version](https://img.shields.io/badge/Version-v2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Minecraft](https://img.shields.io/badge/Minecraft-1.20.1-orange)
![License](https://img.shields.io/badge/License-MIT-green)

**Ein vollautomatisierter Bot zur Konstruktion von Minecraft-Dörfern mit Chat-Befehlen. Gebaut mit Mineflayer + Docker.**

---

## 📋 Inhaltsverzeichnis

- [Features](#features)
- [Systemanforderungen](#systemanforderungen)
- [Installation](#installation)
  - [Docker Installation (Empfohlen)](#docker-installation-empfohlen)
  - [Lokale Installation](#lokale-installation)
- [Konfiguration](#konfiguration)
- [Verwendung](#verwendung)
  - [Bot-Befehle](#bot-befehle)
  - [Schematic-Handling](#schematic-handling)
- [Projektstruktur](#projektstruktur)
- [API-Referenz](#api-referenz)
  - [Bot-Klasse](#bot-klasse)
  - [Schematic-Klasse](#schematic-klasse)
- [Entwicklung](#entwicklung)
  - [Git-Workflow](#git-workflow)
  - [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Lizenzen & Attributionen](#lizenzen--attributionen)
- [Support](#support)

---

## ✨ Features

| Feature | Status | Beschreibung |
|---------|--------|-------------|
| 🏘️ **Automatischer Dorfbau** | ✅ | Builds entire villages from schematics via chat commands |
| 💬 **Chat-Befehle** | ✅ | Intuitive commands for building and automation |
| 📦 **Schematic-Support** | ✅ | Lädt WorldEdit `.schem` Dateien und konvertiert zu JS-Format |
| 🗂️ **Batch-Processing** | ✅ | Baut mehrere Strukturen nacheinander automatisch |
| 🔧 **Blockplatzierung** | ✅ | Intelligente Block-by-Block Platzierung mit Validierung |
| 📍 **Pathfinding** | ✅ | Automatische Wegfindung zum Build-Ort |
| 💾 **Schematic-Editor** | 🟡 | Partial support für Schematic-Manipulation |
| 🌍 **Multi-Server Support** | ✅ | Verbindung zu mehreren Minecraft-Servern möglich |
| 🔌 **Discord Integration** | 🟡 | Webhook-Support für Benachrichtigungen in Progress |
| 🐛 **Error Recovery** | ✅ | Automatische Fehlerbehandlung & Wiederaufnahme |
| 📊 **Logging & Analytics** | ✅ | Detaillierte Logs für Debugging |
| 🔄 **Hot Reload** | ✅ | Code-Änderungen ohne Neustart testen |

---

## 🖥️ Systemanforderungen

### Minimum
- **Node.js**: 16+ LTS
- **RAM**: 512 MB (lokal) / 1 GB (Docker)
- **Disk**: 200 MB
- **Minecraft Server**: 1.20.1 (Vanilla oder Spigot/Paper)

### Empfohlen
- **Node.js**: 18+ LTS
- **RAM**: 2 GB+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### Betriebssysteme
- ✅ Linux (Debian/Ubuntu)
- ✅ macOS
- ✅ Windows (WSL2 empfohlen)

---

## 📦 Installation

### Docker Installation (Empfohlen)

**Voraussetzungen:** Docker & Docker Compose installiert

1. **Repository klonen:**
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
```

2. **Umgebungsvariablen setzen:**
```bash
cp .env.example .env
nano .env  # oder dein Lieblings-Editor
```

3. **Docker Compose starten:**
```bash
docker-compose up -d
```

4. **Logs überprüfen:**
```bash
docker-compose logs -f bot
```

5. **Bot stoppen:**
```bash
docker-compose down
```

---

### Lokale Installation

**Voraussetzungen:** Node.js 16+ installiert

1. **Repository klonen & Dependencies installieren:**
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
npm install
```

2. **.env konfigurieren:**
```bash
cp .env.example .env
nano .env
```

3. **Bot starten:**
```bash
npm start
```

4. **Entwicklungsmodus (Hot Reload):**
```bash
npm run dev
```

5. **Logs beobachten:**
```bash
npm start | grep -i "connected\|error\|building"
```

---

## ⚙️ Konfiguration

### .env Datei

```env
# Minecraft Server
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=VillageBuilder
MC_PASSWORD=          # Leer für offline Mode
MC_VERSION=1.20.1

# Bot Einstellungen
BOT_LOG_LEVEL=info    # debug, info, warn, error
BOT_AUTO_RESPAWN=true
BOT_CHECK_HEALTH=true

# Schematic Einstellungen
SCHEM_FOLDER=./schematics
SCHEM_AUTO_CONVERT=true

# Discord Integration (Optional)
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
DISCORD_ENABLED=false

# Performance
BOT_BLOCK_DELAY=100   # ms zwischen Block-Platzierungen
BOT_CHUNK_LOAD_WAIT=1000
```

### Schematics Ordner-Struktur

```
schematics/
├── houses/
│   ├── simple_house.schem
│   ├── farm_house.schem
│   └── cottage.schem
├── farms/
│   ├── wheat_farm.schem
│   └── animal_pen.schem
├── converted/         # Auto-generiert
│   ├── simple_house.js
│   ├── farm_house.js
│   └── cottage.js
└── README.md
```

---

## 🚀 Verwendung

### Bot-Befehle

#### Generelle Befehle

| Befehl | Beispiel | Beschreibung |
|--------|----------|-------------|
| `!ping` | `!ping` | Testet Bot-Verbindung |
| `!status` | `!status` | Zeigt aktuellen Bot-Status |
| `!help` | `!help` | Listet alle verfügbaren Befehle |
| `!pos` | `!pos` | Gibt aktuelle Position aus |

#### Build-Befehle

| Befehl | Beispiel | Beschreibung |
|--------|----------|-------------|
| `!build <schematic>` | `!build simple_house` | Baut Schematic an aktueller Position |
| `!build <schematic> <x> <y> <z>` | `!build farm_house 100 64 200` | Baut an spezifischer Koordinate |
| `!batch <folder>` | `!batch houses` | Baut alle Strukturen in Ordner |
| `!cancel` | `!cancel` | Bricht aktuellen Build ab |
| `!list` | `!list` | Listet verfügbare Schematics |

#### Verwaltungs-Befehle

| Befehl | Beispiel | Beschreibung |
|--------|----------|-------------|
| `!convert <schem_file>` | `!convert my_structure.schem` | Konvertiert .schem zu .js |
| `!reload` | `!reload` | Reload aller Konfigurationen |
| `!debug` | `!debug` | Aktiviert Debug-Modus |
| `!stop` | `!stop` | Stoppt Bot sauber |

### Schematic-Handling

#### WorldEdit Schematics importieren

```bash
# 1. In Minecraft: //save my_structure
# 2. Datei verschieben nach: schematics/my_structure.schem

# 3. Mit dem Bot konvertieren:
# Im Chat: !convert my_structure.schem
# ODER manuell:
node tools/convert_schem.js my_structure.schem
```

#### Schematics zu .js konvertieren

```bash
# Alle Schematics im Ordner konvertieren:
npm run convert-schematics

# Spezifische Datei konvertieren:
node tools/convert_schem.js schematics/my_structure.schem
```

#### Batch-Building

```javascript
// Im Bot-Code oder über Chat:
!batch houses    // Baut alle Häuser nacheinander
// Warte auf Komplettierung mit Logs
```

---

## 📁 Projektstruktur

```
mc-village-bot/
├── src/
│   ├── index.js                 # Einstiegspunkt
│   ├── bot.js                   # Hauptbot-Klasse
│   ├── schematic.js             # Schematic-Parser & Handler
│   ├── commands.js              # Chat-Befehl-Handler
│   ├── logger.js                # Logging-Utility
│   ├── config.js                # Konfigurationsmanagement
│   └── utils/
│       ├── pathfinding.js       # Wegfindung-Algorithmus
│       ├── blockValidator.js    # Block-Platzierungslogik
│       └── discord.js           # Discord-Integration
├── tools/
│   ├── convert_schem.js         # Schematic-Converter
│   └── batch_convert.js         # Batch-Konvertierung
├── schematics/                  # Schematic-Dateien
│   ├── houses/
│   ├── farms/
│   └── converted/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── logs/                        # Log-Dateien
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API-Referenz

### Bot-Klasse

```javascript
const Bot = require('./src/bot');

const bot = new Bot({
  host: 'localhost',
  port: 25565,
  username: 'VillageBuilder',
  logLevel: 'info'
});

// Events
bot.on('connected', () => {
  console.log('Bot verbunden!');
});

bot.on('buildProgress', (progress) => {
  console.log(`Build: ${progress.current}/${progress.total}`);
});

bot.on('buildComplete', (result) => {
  console.log('Build abgeschlossen!', result);
});

// Methoden
await bot.build(schematicName, x, y, z);
await bot.cancelBuild();
bot.getStatus();
```

### Schematic-Klasse

```javascript
const Schematic = require('./src/schematic');

// Schematic laden
const schem = Schematic.fromFile('schematics/converted/house.js');

// Dimensionen abfragen
console.log(schem.width, schem.height, schem.length);

// Alle Blöcke iterieren
schem.forEachBlock((block, x, y, z) => {
  console.log(`Block: ${block.name} at ${x},${y},${z}`);
});

// Schematic speichern
schem.save('output/modified_house.js');
```

---

## 👨‍💻 Entwicklung

### Git-Workflow

```bash
# 1. Feature-Branch erstellen
git checkout -b feature/my-feature develop

# 2. Änderungen committen
git add .
git commit -m "feat: add awesome feature"

# 3. An Upstream pushen
git push origin feature/my-feature

# 4. Pull Request erstellen auf develop

# 5. Nach Review mergen
git checkout develop
git pull origin develop
git merge feature/my-feature
```

### Branch-Strategie

| Branch | Zweck | Status |
|--------|-------|--------|
| `main` | Production Release | ⚡ Stable |
| `develop` | Development & Testing | 🔄 Active |
| `feature/*` | Feature-Entwicklung | 👷 In Progress |
| `hotfix/*` | Bug-Fixes für main | 🐛 Critical |

### Best Practices

```bash
# Code lokal testen vor dem Push
npm run test
npm run lint

# Sicherstellen, dass develop aktuell ist
git fetch origin
git rebase origin/develop

# Aussagekräftige Commit-Messages verwenden
# Format: [type]: [description]
# Beispiele:
# - feat: add batch building feature
# - fix: resolve pathfinding issue
# - docs: update README installation guide
# - refactor: optimize block placement logic

# Nach Merge Branches löschen
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Lokale Entwicklung

```bash
# 1. Dependencies installieren
npm install

# 2. Watch-Mode für Entwicklung
npm run dev

# 3. In anderem Terminal: Tests
npm run test

# 4. Linting
npm run lint

# 5. Code formatieren
npm run format
```

---

## 🐛 Troubleshooting

### Bot verbindet sich nicht

```bash
# 1. Server-Erreichbarkeit testen
ping localhost

# 2. Port überprüfen
netstat -an | grep 25565

# 3. Logs lesen
docker-compose logs bot
# oder lokal:
npm start 2>&1 | grep -i "error\|connecting"

# 4. .env Variablen überprüfen
cat .env | grep MC_

# 5. Minecraft Server-Version überprüfen
# Bot erwartet 1.20.1
```

### Schematic-Konvertierung schlägt fehl

```bash
# 1. Datei-Format überprüfen
file schematics/my_structure.schem
# Sollte: data output sein

# 2. Datei-Größe überprüfen (max. 10 MB empfohlen)
ls -lh schematics/my_structure.schem

# 3. Manuell konvertieren mit Debugging
node tools/convert_schem.js schematics/my_structure.schem --debug

# 4. Converted-Ordner überprüfen
ls -la schematics/converted/
```

### Build stoppt unerwartet

```bash
# 1. Bot-Gesundheit überprüfen
!status

# 2. Chunk-Loading überprüfen
docker-compose logs bot | grep -i "chunk"

# 3. Block-Platzierung debuggen
# In .env: BOT_LOG_LEVEL=debug
# Dann erneut versuchen

# 4. Bei Memory-Problemen
docker stats
# Falls zu hoch: BOT_BLOCK_DELAY erhöhen
```

### Docker-Probleme

```bash
# Container neustarten
docker-compose restart bot

# Volumes prüfen
docker volume ls

# Komplett neustarten
docker-compose down -v
docker-compose up -d

# Logs vom Build prüfen
docker-compose logs --tail=100 bot
```

### Performance-Probleme

```bash
# Langsames Bauen beschleunigen:
# In .env: BOT_BLOCK_DELAY=50  (default 100)

# Speicher-Probleme reduzieren:
BOT_CHUNK_LOAD_WAIT=1500  # Chunk-Loading verlangsamen

# CPU-Last prüfen
top -p $(docker inspect -f '{{.State.Pid}}' mc-village-bot_bot_1)
```

---

## 📄 Lizenzen & Attributionen

| Projekt | Lizenz | Verwendung |
|---------|--------|-----------|
| **MC Village Bot** | MIT | Hauptprojekt |
| **Mineflayer** | MIT | Bot-Framework & Minecraft-Protocol |
| **WorldEdit** | GNU GPL v3 | Schematic-Format-Referenz |
| **Node.js** | MIT | Runtime-Umgebung |

### Verwandte Projekte
- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Minecraft Bot Framework
- [Prismarine](https://github.com/PrismarineJS) - Minecraft-Protokoll-Implementierungen
- [WorldEdit](https://enginehub.org/worldedit/) - Schematic-Format Standard

---

## 📧 Support

### Hilfe bekommen

- 🐛 **Bugs melden:** [GitHub Issues](https://github.com/derlemue/mc-village-bot/issues)
- 💬 **Fragen stellen:** [GitHub Discussions](https://github.com/derlemue/mc-village-bot/discussions)
- 📖 **Dokumentation:** [Wiki](https://github.com/derlemue/mc-village-bot/wiki)
- 🔍 **Logs prüfen:** `docker-compose logs -f bot`

### Ressourcen

| Ressource | Link | Beschreibung |
|-----------|------|-------------|
| Mineflayer Docs | [GitHub](https://github.com/PrismarineJS/mineflayer) | Bot-Framework Dokumentation |
| Minecraft Wiki | [wiki.minecraft.net](https://minecraft.wiki) | Vanilla-Mechaniken & Blöcke |
| Docker Docs | [docs.docker.com](https://docs.docker.com) | Docker & Compose Tutorial |
| Node.js Docs | [nodejs.org](https://nodejs.org/docs) | JavaScript Runtime-Referenz |

---

## 🎯 Roadmap

### v2.1 (Geplant)
- [ ] Verbessertes Pathfinding mit A*-Algorithmus
- [ ] Multi-Threaded Block-Placement
- [ ] WebUI für Bot-Monitoring
- [ ] Schematic-Validierung vor Build

### v2.2 (Geplant)
- [ ] Discord-Bot Integration
- [ ] Automated Testing Suite
- [ ] Performance-Optimierungen
- [ ] Schematic-Editor GUI

### v3.0 (Zukunft)
- [ ] Machine Learning für optimale Platzierung
- [ ] Support für Custom-Blöcke/Mods
- [ ] Multi-Bot Koordination
- [ ] Echtzeit-Visualisierung

---

## 📊 Version-Info

| Info | Wert |
|------|------|
| **Aktuelle Version** | 2.0 |
| **Status** | 🟢 Active Development |
| **Letztes Update** | 2025-12-03 |
| **Node.js** | 16+ LTS |
| **Minecraft** | 1.20.1 |
| **Betrieb** | Docker Compose + Mineflayer |

---

## 📝 Lizenz

Dieses Projekt ist unter der [MIT License](LICENSE) lizenziert. Du darfst es frei verwenden, modifizieren und verteilen - solange du die Lizenz-Datei beifügst.

---

**Viel Spaß beim Dorfbau! 🏘️✨**

*Erstellt mit ❤️ von derlemue | Letzte Aktualisierung: Dezember 2025*
