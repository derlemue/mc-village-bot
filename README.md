# 🏰 Minecraft Village Bot

![License](https://img.shields.io/badge/license-Free%20for%20Non--Commercial%20Use-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

Ein hochoptimierter, modularer Minecraft-Bot, der in der Lage ist, ganze Dörfer mit Infrastruktur, Wegen und Gebäuden vollautomatisch zu errichten.

## ✨ Features

- **🚀 High-Performance Building**: Nutzt optimierte `/fill` Befehle statt langsamer `/setblock` Operationen.
- **🧠 Intelligente Architektur**:
  - **Recursive Splitting**: Teilt automatisch Bauaufträge, die das Minecraft-Blocklimit (32k) überschreiten.
  - **Iterative Command Stack**: Verhindert `Stack Overflow` Abstürze durch iterative Abarbeitung.
  - **Throttling**: Automatische Pausen und Ratenbegrenzung zur Vermeidung von Server-Kicks.
- **🛣️ Smart Road System**: Verbindet automatisch neue Gebäude mit dem Dorfzentrum oder existierenden Wegen mittels A* (ähnlicher) Pfadfindung.
- **🏘️ Dynamisches Dorf-Management**: Verwaltet mehrere Dörfer, erkennt Kollisionen und findet automatisch freie Bauplätze.
- **💡 Automatische Beleuchtung**: Platziert Laternen entlang von Straßen und um Gebäude.

## 📂 Projektstruktur

```
mc-village-bot/
├── index.js                # Haupt-Einstiegspunkt & Loop-Logik
├── modules/                # Kern-Module
│   ├── builder.js          # Bau-Logik (/fill & Details)
│   ├── commandHelper.js    # Optimierte Command-Queue & Chunking
│   ├── movement.js         # Bot-Bewegung & Teleportation
│   ├── streets.js          # Straßenbau & Pfadfindung
│   ├── terrain.js          # Geländevorbereitung
│   ├── villageManager.js   # Dorf-Verwaltung & Platzsuche
│   ├── templateLoader.js   # Lädt Schematics
│   └── persistence.js      # Speichert Fortschritt (JSON)
├── schematics/             # Gebäude-Templates (.js)
│   ├── kneipe.js
│   ├── schloss.js
│   ├── stadium.js
│   └── freiraum.js
└── data/                   # Gespeicherte Laufzeit-Daten
    ├── streets.json
    └── villages.json
```

## 🚀 Installation & Start

1. **Repository klonen**
   ```bash
   git clone https://github.com/derlemue/mc-village-bot.git
   cd mc-village-bot
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Konfiguration**
   Erstelle eine `.env` Datei basierend auf `.env.example`:
   ```env
   MC_HOST=dein.server.ip
   MC_PORT=25565
   MC_USERNAME=BotName
   MC_AUTH=microsoft
   ```

4. **Starten**
   ```bash
   npm start
   ```

## 🎮 Befehle (In-Game Chat)

Der Bot reagiert auf Chat-Befehle von Spielern:

| Befehl | Beschreibung | Beispiel |
|--------|--------------|----------|
| `!build <x> <y> <z> [template] [count]` | Baut `count` Gebäude ab Position `x,y,z`. | `!build 100 64 100 kneipe 5` |
| `!stop` | Stoppt alle aktuellen Bauvorgänge sofort. | `!stop` |
| `!templates` | Listet alle verfügbaren Gebäude-Typen auf. | `!templates` |

## 🛠️ Technische Details

### Optimierung (CommandHelper)
Der `CommandHelper` ist das Herzstück der Performance. Er fängt `/fill` Befehle ab:
- **Validation**: Prüft Koordinaten auf `NaN` oder `Infinity`.
- **Chunking**: Zerlegt Volumen > 32.768 Blöcke in kleinere Cuboids.
- **Safety**: Nutzt eine iterative Stack-Logik statt Rekursion, um `Maximum Call Stack Size Exceeded` zu verhindern.
- **Rate-Limit**: Fügt 250ms Verzögerung zwischen Befehlen ein.

### Straßenbau (StreetBuilder)
- Prüft 5x1 breite Korridore auf Hindernisse.
- Baut Straßen automatisch auf `buildY`.
- Hebt Gelände an oder senkt es ab (Clearance).
- Platziert Laternen in regelmäßigen Abständen.

## 📄 Lizenz

**Freie Nutzung für nicht-kommerzielle Zwecke.**

Dieses Projekt darf kostenlos verwendet, modifiziert und privat oder in Non-Profit-Kontexten eingesetzt werden. Eine kommerzielle Nutzung (Verkauf, kostenpflichtige Services basierend auf diesem Code) ist ohne Genehmigung nicht gestattet.

---
*Built with ❤️ by Antigravity*
