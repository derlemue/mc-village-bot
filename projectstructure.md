minecraft-village-bot/
├── docker-compose.yml            # Docker Konfiguration
├── README.md                     # Projektbeschreibung (hier)
├── .env                          # Umgebungsvariablen, z.B. Tokens
├── data/                         # Persistente Dateien (Baufortschritt, Villages, etc.)
│   ├── buildings.json
│   ├── villages.json
│   └── token.json (bei Bedarf)
├── config/                       # Konfigurationsdateien & Templates
│   ├── houses.js                 # Beispiel-Häuser Vorlage
│   ├── templates/                # Ordner für spezielle Bauvorlagen
│   │   ├── farmer.js
│   │   ├── weaponsmith.js
│   │   └── lighthouse.js
│   └── villageLayout.js          # Dorf Layout Einstellungen
├── modules/                      # Haupt-Module
│   ├── builder.js                # Bau-Logik, inklusive Modul-aufteilung
│   ├── chunkLoader.js            # Chunk Laden Logik
│   ├── utils.js                  # Hilfsfunktionen
│   ├── blockUtils.js             # Blöcke setzen, abfragen, Tür, etc.
│   └── persistence.js            # Datenbank (JSON) Speichern/Laden
├── index.js                      # Startpunkt, Initialisierung, Hauptlogik
└── package.json                  # Node.js Projektbeschreibung
