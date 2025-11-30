# MC Village Bot V2

Ein automatisierter Minecraft-Bot zum automatischen Erstellen von Dörfern mit Straßenlayouts, Fundament und Gebäuden.

## 🎯 Features

- **Automatisches Dorf-Generierung**: Vollautomatische Planung und Bau von kompletten Dörfern
- **Intelligente Straßenlayouts**: Diagonale Kreuzungen mit 4er-Blöcken (3er-Überlappung)
- **Terrain-Vorbereitung**: Automatisches Planieren und Vorbereiten des Baugeländes
- **Material-Management**: Automatische Verwaltung von Baumaterialien (Stone Bricks, Deepslate Tiles)
- **Struktur-Import**: Support für Struktur-Dateien mit mehreren Ebenen
- **Flexible Konfiguration**: YAML-basierte Konfiguration für alle Parameter
- **Chat-Befehle**: In-Game Befehle zum Starten/Stoppen des Bots

## 📋 Anforderungen

- Python 3.8+
- Minecraft Server mit aktiviertem Rcon
- Docker & Docker Compose (optional, für containerisierte Bereitstellung)
- Python-Dependencies: siehe `requirements.txt`

## 🚀 Schnellstart

### Installation

```bash
# Repository klonen
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot

# Dependencies installieren
pip install -r requirements.txt
```

### Konfiguration

1. `config.yaml` erstellen/anpassen:

```yaml
# Minecraft Server
server:
  host: "localhost"
  port: 25575
  password: "your-rcon-password"

# Build-Einstellungen
build:
  village_center: [0, 64, 0]        # Zentrum des Dorfes
  village_radius: 100                # Radius des Dorfes
  
  materials:
    street: "stone_bricks"           # Material für Straßen
    filler: "deepslate_tiles"        # Füllmaterial
    
  street_layout:
    width: 4                          # Straßenbreite
    diagonal_overlap: 3               # Überlappung bei diagonalen Kreuzungen
    
  terrain:
    flat_height: true                 # Gelände einebnen?
    clear_radius: 2                   # Umkreis zum Löschen

  building:
    spacing: 20                        # Abstand zwischen Gebäuden
    placement_offset: 2                # Abstand zum Fundament
```

2. Bot starten:

```bash
python bot.py
```

## 📡 Chat-Befehle

### Admin-Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `!build <x> <z>` | Startet den Bau an den Koordinaten (y+20) |
| `!stop` | Stoppt den aktuellen Bau sofort |
| `!status` | Zeigt aktuellen Status des Bots |
| `!reset` | Setzt den Bot zurück |
| `!plan` | Zeigt den Bauplan für das Dorf |

## 🏗️ Architektur

### Module

```
bot/
├── bot.py              # Haupteinstiegspunkt
├── config.py           # Konfigurationsverwaltung
├── minecraft/
│   ├── connection.py   # RCON-Verbindung
│   ├── player.py       # Spieler-Bewegung & Interaktion
│   └── commands.py     # Chat-Befehle
├── building/
│   ├── terrain.py      # Terrain-Vorbereitung
│   ├── streets.py      # Straßen-Generierung
│   ├── foundation.py   # Fundament-Platzierung
│   └── structures.py   # Struktur-Laden & Platzierung
└── utils/
    ├── logger.py       # Logging
    └── geometry.py     # Geometrie-Berechnungen
```

### Workflow V2

```
Bot-Start
  ├─ Konfiguration laden
  ├─ RCON-Verbindung herstellen
  ├─ Chat-Befehle registrieren
  └─ Warten auf !build-Befehl
  
  ├─ [!build x z]
  │   ├─ Teleportieren zu (x, y+20, z)
  │   ├─ Zu Bauplatz laufen
  │   ├─ Terrain vorbereiten (Level)
  │   ├─ Straßen zeichnen (4er-Blöcke, diag. 3er-Überlappung)
  │   ├─ Fundament platzieren
  │   ├─ Gebäude-Strukturen laden
  │   ├─ Gebäude platzieren
  │   ├─ Nach Gebäude-Fertigstellung näher rücken
  │   ├─ Dateien speichern
  │   └─ Nächster Standort
  │
  └─ [!stop]
      └─ Aktuellen Bau abbrechen
```

## ⚙️ Erweiterte Konfiguration

### Gebäude-Strukturen

Struktur-Dateien werden mit mehreren Ebenen unterstützt:

```yaml
buildings:
  - name: "house_large"
    file: "structures/house_large.nbt"
    levels: 27
    offset: [0, 0, 0]
    material_overrides:
      old_block: "new_block"
```

### Optimierungsparameter

```yaml
performance:
  movement_speed: 50    # % Normal-Geschwindigkeit (50% = langsamer)
  action_delay: 2.0     # Sekunden Pause zwischen Aktionen
  chunk_preload: true   # Chunks vorladen?
  max_entities: 100     # Max. Entities in Sichtbereich
```

## 🐳 Docker-Deployment

```bash
# Mit Docker Compose starten
docker-compose up -d

# Logs anschauen
docker-compose logs -f bot

# Container stoppen
docker-compose down
```

### docker-compose.yml Beispiel

```yaml
version: '3.8'

services:
  bot:
    build: .
    container_name: mc-village-bot
    environment:
      - MC_HOST=mc-server
      - MC_PORT=25575
      - MC_PASSWORD=${RCON_PASSWORD}
    volumes:
      - ./config.yaml:/app/config.yaml
      - ./structures:/app/structures
      - ./logs:/app/logs
    depends_on:
      - mc-server
    restart: unless-stopped

  mc-server:
    image: itzg/minecraft-server:java17
    environment:
      EULA: "TRUE"
      MODE: creative
      ENABLE_RCON: "true"
      RCON_PORT: 25575
      RCON_PASSWORD: ${RCON_PASSWORD}
    ports:
      - "25565:25565"
      - "25575:25575"
    volumes:
      - ./data:/data
    restart: unless-stopped
```

## 📊 Ausgabe & Protokollierung

Der Bot speichert automatisch:

- **Log-Dateien**: `logs/bot_YYYY-MM-DD.log`
- **Build-Reports**: `output/village_report_[timestamp].json`
- **Koordinaten-Dateien**: `output/coordinates_[timestamp].txt`

Beispiel-Output:

```json
{
  "timestamp": "2025-11-30T02:12:00Z",
  "village_center": [0, 64, 0],
  "buildings_placed": 42,
  "streets_length": 850,
  "total_blocks": 12500,
  "errors": []
}
```

## 🔧 Troubleshooting

### Bot verbindet sich nicht

```bash
# RCON-Port prüfen
netstat -an | grep 25575

# Server-Properties prüfen
cat server.properties | grep rcon
```

### Gebäude platzieren fehlgeschlagen

- Struktur-Dateien auf Validität prüfen
- Level-Angabe in config.yaml überprüfen
- Genügend Platz im Dorf?

### Langsamerer Bot-Betrieb

In `config.yaml` anpassen:

```yaml
performance:
  movement_speed: 50      # Noch langsamer (50%)
  action_delay: 3.0       # Längere Pausen
```

## 📝 Änderungen in V2

### Neue Features
- ✨ Diagonale Straßen-Kreuzungen mit 4er-Block-Breite und 3er-Überlappung
- ✨ Automatische Fundament-Platzierung
- ✨ Multi-Level Struktur-Support
- ✨ Bessere Fehlerbehandlung und Recovery
- ✨ Detaillierte Output-Dateien und Reports

### Verbesserungen
- 🚀 Optimierte Bewegungs-Algorithmen
- 🚀 Bessere Terrain-Vorbereitungen
- 🚀 Feinere Kontrolle über Bau-Parameter
- 🚀 Verbesserte Logging und Debugging-Infos
- 🚀 Robustere RCON-Kommunikation

### Breaking Changes
- `config.ini` → `config.yaml` Format
- Chat-Befehl Syntax geändert (`!build` statt `/build`)
- Struktur-Dateien-Format aktualisiert

## 🤝 Beitragen

Contributions sind willkommen! Bitte:

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizenziert - siehe die `LICENSE` Datei für Details.

## 📧 Support

Fragen oder Probleme?

- 🐛 Issues auf GitHub: [Issues](https://github.com/derlemue/mc-village-bot/issues)
- 💬 Diskussionen: [Discussions](https://github.com/derlemue/mc-village-bot/discussions)

## 🙏 Danksagungen

- Minecraft Community für Inspiration
- RCON-Protokoll-Dokumentation
- Alle Contributor und Tester

---

**Status**: V2 Entwicklung aktiv  
**Letztes Update**: 2025-11-30  
**Python Version**: 3.8+  
**Minecraft Versions**: 1.19+
