# Minecraft Village Builder Bot 🏘️

Ein modulares, erweiterbares **Node.js-basiertes Bot-System** für den automatischen Bau von Dörfern in Minecraft mit dem [Mineflayer](https://github.com/PrismarineJS/mineflayer)-Framework. Ideal für Serveradministratoren, Entwickler und Enthusiasten, die automatisierte Bauprojekte durchführen möchten.

---

## 🎯 Funktionen

- **Automatischer Dorfaufbau** – Erzeugung von Häusern, Straßen, Türmen und anderen Strukturen
- **Flexible Vorlagen** – Unterstützung verschiedener Bauvorlagen (farmer, weaponsmith, lighthouse, etc.)
- **Intelligentes Chunk-Loading** – Vorladen erforderlicher Chunks zum stabilen Bauen
- **Adaptive Fundamente** – Automatische Berechnung der Fundamenttiefe basierend auf Umgebung
- **Intelligenter Straßenbau** – Gerade und diagonale Straßen mit Überlappung und Luftschichten
- **Datenpersistenz** – Speicherung des Baufortschritts und Villages in JSON-Dateien
- **Chat-Integration** – Steuerung via Minecraft-Chat-Befehle oder Discord Webhooks
- **Robustes Fehlerhandling** – Vermeidung von Endlosschleifen und Crashes
- **Docker-Ready** – Sofort einsatzbereit mit Docker Compose

---

## 📋 Voraussetzungen

### System
- **Node.js** >= 16.x
- **npm** oder **yarn**
- Oder: **Docker & Docker Compose** (empfohlen für Linux-Server)

### Minecraft
- Ein Minecraft-Server (Java Edition) oder ein öffentlicher Server mit Zugriff
- Bot-Konto mit ausreichenden Permissions (Baurechte)
- Vanilla oder Spigot/Paper (empfohlen für Stabilität)

---

## 🚀 Installation & Einrichtung

### Option 1: Docker (Empfohlen für Linux-Server)

#### 1. Repository klonen
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
```

#### 2. Umgebungsvariablen konfigurieren
Erstelle eine `.env`-Datei im Projektroot:

```env
# Minecraft Server
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=VillageBot
MC_PASSWORD=your_password_here
MC_VERSION=1.20.1

# Bot Verhalten
BOT_DEBUG=true
BOT_LOG_LEVEL=info

# Discord Webhook (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
```

#### 3. Docker Container starten
```bash
docker-compose up -d
```

#### 4. Logs überprüfen
```bash
docker-compose logs -f
```

#### 5. Container stoppen
```bash
docker-compose down
```

---

### Option 2: Lokale Installation (Entwicklung/Windows)

#### 1. Repository klonen
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
```

#### 2. Abhängigkeiten installieren
```bash
npm install
```

#### 3. Umgebungsvariablen einrichten
Erstelle `.env` (siehe Option 1) oder kopiere `.env.example`:

```bash
cp .env.example .env
# Bearbeite die Datei mit deinem Editor
nano .env
```

#### 4. Bot starten
```bash
npm start
```

Für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

---

## ⚙️ Konfiguration

### Projektstruktur
```
minecraft-village-bot/
├── modules/
│   ├── builder.js          ✅ (mit BulkTerrain Integration)
│   ├── bulkTerrain.js      ⭐ NEU - Multi-Threading Terrain
│   ├── chunkLoader.js
│   ├── blockUtils.js
│   ├── utils.js
│   └── persistence.js
│
├── workers/                ⭐ NEU - Worker-Threads
│   ├── terrainCalculator.js
│   └── blockBatcher.js
│
├── config/
│   ├── terrainConfig.js    ⭐ NEU - Terrain-Konfiguration
│   ├── villageLayout.js
│   └── houses.js
│
├── data/
├── index.js
├── package.json            ✅ (Dependencies OK)
└── README.md
```

### Wichtige Konfigurationsdateien

#### `.env` – Serververbindung
```env
MC_HOST=play.example.com        # Server-Adresse
MC_PORT=25565                   # Port (Standard: 25565)
MC_USERNAME=VillageBot          # Bot-Username
MC_PASSWORD=password123         # Passwort (bei offline-mode: beliebig)
MC_VERSION=1.20.1               # Minecraft-Version

BOT_DEBUG=false                 # Debug-Ausgaben aktivieren
BOT_START_X=0                   # Start-Position X
BOT_START_Y=64                  # Start-Position Y
BOT_START_Z=0                   # Start-Position Z

DISCORD_WEBHOOK_URL=            # Optional: Discord-Benachrichtigungen
```

#### `config/villageLayout.js` – Dorf-Layout anpassen
```javascript
module.exports = {
  gridSpacing: 16,              // Abstand zwischen Häusern
  streetWidth: 2,               // Straßenbreite
  streetMaterial: 'stone_bricks', // Straßenmaterial
  fillerMaterial: 'deepslate_tiles', // Füller-Material
  maxBuildingsPerVillage: 25,   // Max. Häuser pro Dorf
};
```

#### `config/templates/farmer.js` – Bauvorlagen definieren
Vorlagen enthalten Block-Anordnungen, Dimensionen und spezielle Blöcke.

---

## 🎮 Betrieb & Verwendung

### Chat-Befehle im Spiel

Der Bot antwortet auf diese Befehle im Minecraft-Chat:

| Befehl | Beschreibung | Beispiel |
|--------|-------------|---------|
| `!build` | Startet den Bau an der Bot-Position | `!build` |
| `!build <x> <y> <z>` | Startet Bau an Koordinaten | `!build 100 64 200` |
| `!status` | Zeigt den aktuellen Status | `!status` |
| `!pause` | Pausiert den laufenden Bau | `!pause` |
| `!resume` | Setzt den Bau fort | `!resume` |
| `!stop` | Stoppt den Bau | `!stop` |
| `!villages` | Listet alle erstellten Dörfer | `!villages` |
| `!teleport <village_id>` | Teleportiert zum Dorf | `!teleport village_1` |

### Bot-Verhalten

**Startet automatisch einen Bau:**
1. Bot lädt notwendige Chunks
2. Berechnet Fundamente basierend auf Terrain
3. Platziert Strukturen nach Vorlage
4. Baut Straßen zwischen Häusern
5. Speichert Fortschritt persistent

**Bei Fehlern:**
- Automatische Wiederholung bis 3x
- Fallback auf alternative Blöcke
- Logging der Fehler in `data/logs/`

### Monitoring & Logs

#### Docker-Logs
```bash
# Live-Logs anschauen
docker-compose logs -f

# Nur letzte 100 Zeilen
docker-compose logs --tail=100
```

#### Lokale Logs
```bash
# Logdatei ansehen
tail -f data/logs/bot.log
```

#### Persistente Daten überprüfen
```bash
# Erstellte Gebäude anschauen
cat data/buildings.json | jq '.'

# Dörfer-Verzeichnis
cat data/villages.json | jq '.'
```

---

## 🔧 Erweiterte Konfiguration

### Custom Bauvorlagen erstellen

Neue Vorlage in `config/templates/custom.js`:

```javascript
module.exports = {
  name: 'custom_house',
  width: 8,
  height: 6,
  depth: 8,
  
  // Block-Matrix (3D)
  blocks: [
    // Schicht für Schicht definieren
    // oder
    // relativeToGround: true
  ],
  
  // Türen & Fenster
  openings: [
    { x: 2, y: 1, z: 0, type: 'door' },
    { x: 1, y: 1, z: 4, type: 'window' },
  ],
  
  // Deko & Details
  details: [
    { x: 0, y: 0, z: 0, block: 'lantern' },
  ],
};
```

### Discord-Integration

Webhook in `.env` setzen:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456/AbCdEfGh
```

Der Bot sendet dann automatisch:
- ✅ Bau gestartet
- ✅ Bau abgeschlossen
- ❌ Fehler aufgetreten

---

## 🐛 Troubleshooting

### Problem: Bot verbindet sich nicht
```
Error: ECONNREFUSED at MC_HOST:MC_PORT
```

**Lösung:**
- Server läuft? `ping <server_ip>`
- Port korrekt? Default ist `25565`
- Firewall blockt Port? Firewall öffnen
- `.env` korrekt? Host-IP statt `localhost` verwenden

### Problem: Bot baut nicht
```
Error: Position not loaded
```

**Lösung:**
- Chunk Loader aktiviert? Check logs
- Position zu weit weg? Bot näher positionieren
- Server hat zu viele Spieler? Später versuchen

### Problem: Block-Platzierung fehlgeschlagen
```
Error: Block placement failed at X Y Z
```

**Lösung:**
- Material-Name korrekt? (z.B. `stone_bricks` statt `stonebricks`)
- Spieler-Rechte ausreichend? OP-Status prüfen
- Block-Typ nicht im 1.20.1? Check Minecraft-Version

### Logs in Docker ansehen
```bash
docker-compose logs --tail=50
docker-compose exec bot npm run debug
```

---

## 📊 Performance-Tipps

| Tipp | Effekt |
|------|--------|
| `BOT_DEBUG=false` | Reduziert Log-Output um 30% |
| Chunk-Preload erhöhen | Stabilität bei großen Projekten |
| Server-TPS > 18 | Bessere Block-Platzierungsgeschwindigkeit |
| RAM > 2GB | Weniger Lag bei vielen Chunks |
| SSD statt HDD | Schnellere Datenpersistenz |

---

## 🔐 Sicherheit

### Best Practices

**Niemals committen:**
- `.env` mit Passwörtern
- `data/token.json`
- Logs mit sensiblen Infos

**Nutze statt dessen:**
```bash
# .env ins .gitignore
echo ".env" >> .gitignore
echo "data/token.json" >> .gitignore

# Nur .env.example committen
git add .env.example
```

**Bot-Konto schützen:**
- Starkes Passwort verwenden
- OP-Status: Nur Admin-Accounts
- Whitelist auf Bot-Namen beschränken (optional)

---

## 📈 Entwicklung & Contributing

### Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Dev-Server mit Hot-Reload
npm run dev

# Tests ausführen
npm test

# Code formatieren
npm run format

# Linting
npm run lint
```

### Struktur für neue Features

1. Neue Logik in `/modules/` oder `/config/`
2. Tests in `/test/` schreiben
3. `.env.example` aktualisieren
4. Pull Request erstellen

---

## 📜 Lizenz

Siehe `LICENSE` (falls vorhanden).

---

## 🤝 Support & Community

- **Issues**: [GitHub Issues](https://github.com/derlemue/mc-village-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/derlemue/mc-village-bot/discussions)
- **Discord**: (Link ggf. hinzufügen)

---

## 🎓 Weiterführende Ressourcen

- [Mineflayer Dokumentation](https://github.com/PrismarineJS/mineflayer)
- [Minecraft Protokoll](https://wiki.vg)
- [Node.js Guide](https://nodejs.org/en/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Made with ❤️ for Minecraft builders**
