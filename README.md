# 🏗️ MC Village Bot

**Automated Minecraft Village Builder using Mineflayer**

An intelligent bot that constructs Minecraft structures and villages. It uses optimized building techniques (Smart `/fill`) to construct large structures in seconds.

---

## Features

- 🤖 **Mineflayer Bot** - Minecraft 1.20.1+ protocol support
- 🚀 **High Performance** - Uses `/fill` commands instead of slow block-by-block placement
- 🏘️ **Village Management** - Automatically manages village centers and building distribution
- 🛣️ **Smart Roads** - Connects buildings with roads and places lighting
- 🐳 **Docker Support** - Easy containerized deployment
- 🧱 **Schematic System** - JavaScript-based templates for dynamic structures

---

## Installation

### Prerequisites

- **Node.js** 16+
- **Minecraft Server** 1.20.1+ (must allow `/fill` and `/setblock` commands)
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/derlemue/mc-village-bot.git
   cd mc-village-bot
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MC_HOST, MC_PORT, MC_USERNAME
   ```

3. **Install & Run**
   ```bash
   npm install
   node index.js
   ```

   *Or with Docker:*
   ```bash
   docker-compose up -d
   ```

---

## Usage

### In-Game Commands

The bot listens to chat commands starting with `!`.

| Command | Usage | Description |
|---------|-------|-------------|
| `!build` | `!build <x> <y> <z> [template] [count]` | Builds one or more structures starting at coordinates. |
| `!templates` | `!templates` | Lists available building templates. |
| `!stop` | `!stop` | Emergency stop for the current build process. |

### Examples

- **Build a single pub**:
  ```
  !build 100 64 200 kneipe
  ```

- **Build a village street (5 houses)**:
  ```
  !build 100 64 200 kneipe 5
  ```

---

## Project Structure

```
mc-village-bot/
├── index.js             # Main entry point and command listener
├── modules/             # Core Logic
│   ├── builder.js       # Handles placing blocks (Smart /fill)
│   ├── commandHelper.js # Splits large /fill volumes automatically
│   ├── movement.js      # Bot teleportation/movement
│   ├── streets.js       # Road connection logic
│   ├── terrain.js       # Terrain preparation (clearing/flattening)
│   ├── templateLoader.js# Loads building templates
│   └── villageManager.js# Manages village state
├── schematics/          # Building Templates (.js files)
│   └── freiraum.js      # Example 100x100 dynamic schematic
├── data/                # Persistent data (villages.json, streets.json)
└── .env                 # Configuration
```

## Optimizations

This bot is optimized for speed and server stability:

- **Smart Fill**: Large areas (like foundations or clearing air) are built using `/fill`.
- **Chunking**: If a volume exceeds Minecraft's 32,768 block limit, it is automatically recursively split into smaller valid chunks.
- **Result**: 100x100 structures are built in seconds rather than hours.

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT
