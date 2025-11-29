# Minecraft Village Builder Bot

Ein modulares, erweiterbares Node.js-basiertes Bot-System für den automatischen Bau von Dörfern in Minecraft mit dem Mineflayer-Framework. Dieses Projekt ist ideal für Serveradministratoren, Entwickler und Enthusiasten, die automatisierte Bauprojekte in Minecraft durchführen möchten.

---

## Funktionen

- **Automatischer Dorfaufbau:** Erzeugung von Häusern, Straßen, Türmen und anderen Strukturen.
- **Flexible Vorlagen:** Unterstützung verschiedener Bauvorlagen, die in `config/templates/` abgelegt sind.
- **Intelligentes Chunk-Loading:** Vorladen der erforderlichen Chunks zum stabilen Bauen.
- **Adaptive Fundamente:** Automatische Berechnung der Fundamenttiefe basierend auf Umgebung.
- **Straßenbau:** Unterstützung von geraden und diagonalen Straßen, Überlappung und Luftschichten.
- **Datenpersistenz:** Speicherung des Baufortschritts und der Villages in JSON-Dateien.
- **Chat-Integration:** Steuerung via Minecraft-Chat-Befehle oder Discord Webhooks.
- **Robustes Fehlerhandling:** Vermeidung von Endlosschleifen und Crashes.

---

## Projektstruktur

```plaintext
minecraft-village-bot/
├── docker-compose.yml            # Docker Konfiguration
├── README.md                     # Projektbeschreibung
├── .env                          # Umgebungsvariablen (z.B. Token)
├── data/                         # Datenbanken und Persistenz
│   ├── buildings.json
│   ├── villages.json
│   └── token.json
├── config/                       # Vorlagendateien und Layouts
│   ├── houses.js
│   ├── templates/
│   │   ├── farmer.js
│   │   ├── weaponsmith.js
│   │   └── lighthouse.js
│   └── villageLayout.js
├── modules/                      # Kernmodule des Bots
│   ├── builder.js                # Bau-Logik, inklusive modularer Aufteilung
│   ├── chunkLoader.js            # Chunk Lade-Management
│   ├── utils.js                  # Hilfsfunktionen
│   ├── blockUtils.js             # Abfragen & Setzen von Blöcken
│   └── persistence.js            # JSON-Datenhaltung
├── index.js                      # Start- und Hauptlogik
└── package.json                  # Node.js Projektbeschreibung
