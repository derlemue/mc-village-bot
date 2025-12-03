# 🏗️ MC Village Bot

**Automated Minecraft Village Builder using Mineflayer**

An intelligent bot that constructs Minecraft structures and villages from WorldEdit schematics. Built with Mineflayer, Node.js, and Docker.

---

## Features

- 🤖 **Mineflayer Bot** - Minecraft 1.20.1+ protocol support
- 💬 **Chat Commands** - Build structures via in-game chat interface
- 📦 **WorldEdit Schematics** - Load and convert `.schem` files to JavaScript
- 🐳 **Docker Support** - Easy containerized deployment
- ⚙️ **Configurable** - Environment variables for all settings
- 🔄 **Auto Reconnect** - Automatic server reconnection on disconnect
- 📊 **Detailed Logging** - Debug-friendly logging system
- 🔧 **Block Placement** - Intelligent block-by-block construction

---

## Installation

### Prerequisites

- **Node.js** 16+ LTS
- **Minecraft Server** 1.20.1 (vanilla/spigot/paper compatible)
- **Git**
- Optional: **Docker & Docker Compose**

### Quick Start

#### With Docker (Recommended)

```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
cp .env.example .env
# Edit .env with your server details
docker-compose up -d
docker-compose logs -f bot
```

#### Local Setup

```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
npm install
cp .env.example .env
# Edit .env with your server details
npm start
```

---

## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```env
# Minecraft Server Connection
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=VillageBuilder
MC_PASSWORD=          # Leave empty for offline mode
MC_VERSION=1.20.1

# Bot Behavior
BOT_LOG_LEVEL=info    # debug | info | warn | error
BOT_AUTO_RESPAWN=true
BOT_RECONNECT=true
BOT_RECONNECT_DELAY=5000

# Schematics
SCHEM_FOLDER=./schematics
SCHEM_AUTO_LOAD=true

# Performance Tuning
BOT_BLOCK_DELAY=100   # ms between block placements
BOT_TICK_RATE=20      # server ticks per second
```

### Folder Structure

```
mc-village-bot/
├── src/
│   ├── index.js           # Bot startup
│   ├── bot.js             # Main bot class
│   ├── commands.js        # Chat command handler
│   ├── schematic.js       # Schematic parser
│   ├── logger.js          # Logging utility
│   └── config.js          # Config manager
├── tools/
│   ├── convert.js         # .schem → .js converter
│   └── validate.js        # Schematic validation
├── schematics/
│   ├── *.schem            # Your WorldEdit schematics
│   └── converted/         # Converted JS schematics (auto-generated)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## Usage

### Bot Commands

Join your Minecraft server and use these chat commands:

#### General

| Command | Usage | Description |
|---------|-------|-------------|
| `!help` | `!help` | Show available commands |
| `!ping` | `!ping` | Test bot connection |
| `!status` | `!status` | Show bot status |
| `!pos` | `!pos` | Display bot position |

#### Building

| Command | Example | Description |
|---------|---------|-------------|
| `!build <name>` | `!build house` | Build at current position |
| `!build <name> <x> <y> <z>` | `!build house 100 64 200` | Build at coordinates |
| `!cancel` | `!cancel` | Stop current build |
| `!list` | `!list` | List available schematics |

#### Admin

| Command | Description |
|---------|-------------|
| `!stop` | Gracefully stop bot |
| `!reload` | Reload configuration |
| `!convert <file>` | Convert .schem file |

### Workflow Example

1. **Create structure in WorldEdit:**
   ```
   //save my_building
   ```

2. **Move file to schematics folder:**
   ```bash
   cp my_building.schem ./schematics/
   ```

3. **Convert schematic (if needed):**
   ```
   !convert my_building.schem
   ```

4. **Build in-game:**
   ```
   !build my_building 100 64 200
   ```

---

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start in watch mode
npm run dev

# Run tests
npm test

# Format code
npm run format

# Lint
npm run lint
```

### Docker Development

```bash
# Build image
docker-compose build

# Start with logs
docker-compose up bot

# View logs
docker-compose logs -f bot

# Execute commands in container
docker-compose exec bot npm run convert-schematics

# Stop
docker-compose down
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature develop

# Commit with conventional format
git add .
git commit -m "feat: add feature description"

# Push and create PR
git push origin feature/your-feature
```

#### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `perf:` Performance improvement

---

## Troubleshooting

### Bot won't connect

```bash
# 1. Check server is online
ping localhost

# 2. Verify port
netstat -an | grep 25565

# 3. Check .env settings
cat .env | grep MC_

# 4. View logs
docker-compose logs -f bot
# or locally:
npm start 2>&1 | head -50
```

### Schematic not converting

```bash
# 1. Verify file exists
ls -lh schematics/your_file.schem

# 2. Check file format
file schematics/your_file.schem

# 3. Manual conversion with debug
node tools/convert.js schematics/your_file.schem --debug

# 4. Check converted folder
ls -la schematics/converted/
```

### Build fails or stops

```bash
# Increase block placement delay
# In .env: BOT_BLOCK_DELAY=150

# Check bot health
!status

# View detailed logs
docker-compose logs -f bot | grep -i "error\|fail"
```

### Memory issues

```bash
# Monitor resource usage
docker stats

# Increase block delay for slower building
# In .env: BOT_BLOCK_DELAY=200

# Check available RAM
free -h
```

### Docker container won't start

```bash
# Rebuild image
docker-compose build --no-cache

# Recreate container
docker-compose down
docker-compose up -d

# Check container logs
docker-compose logs bot
```

---

## Performance Tuning

- **Faster building:** Decrease `BOT_BLOCK_DELAY` (smaller = faster)
- **Stable building:** Increase `BOT_BLOCK_DELAY` if bot disconnects
- **Memory:** Monitor with `docker stats` or `free -h`
- **Network:** Check ping to Minecraft server

Recommended values:
- **Stable:** `BOT_BLOCK_DELAY=150`
- **Normal:** `BOT_BLOCK_DELAY=100` (default)
- **Fast:** `BOT_BLOCK_DELAY=50`

---

## Project Structure Details

### Core Files

**`src/bot.js`** - Main bot class
- Mineflayer bot instance
- Event handlers
- Build command execution

**`src/commands.js`** - Command parser
- Chat message handling
- Command routing
- Permission checks

**`src/schematic.js`** - Schematic handler
- .schem file parsing
- Block data conversion
- Building operations

**`src/logger.js`** - Logging utility
- Colored console output
- Log levels (debug, info, warn, error)
- File logging support

**`tools/convert.js`** - Schematic converter
- WorldEdit .schem → JavaScript
- Block palette conversion
- File generation

---

## Resources

- [Mineflayer GitHub](https://github.com/PrismarineJS/mineflayer)
- [Minecraft Protocol Wiki](https://wiki.vg/)
- [WorldEdit Documentation](https://enginehub.org/worldedit/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/)

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature develop`
3. Make changes and test locally
4. Commit: `git commit -m "feat: description"`
5. Push and create Pull Request

---

## Support

- **Issues:** [GitHub Issues](https://github.com/derlemue/mc-village-bot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/derlemue/mc-village-bot/discussions)
- **Pull Requests:** Welcome!

---

## License

MIT License - See LICENSE file

---

## Version Info

- **Version:** 2.x
- **Status:** Active Development
- **Node.js:** 16+ LTS
- **Minecraft:** 1.20.1+
- **Last Updated:** December 2025

---

**Happy Building! 🏗️**

*For updates: https://github.com/derlemue/mc-village-bot*
