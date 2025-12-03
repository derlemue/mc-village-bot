# 🏗️ MC Village Bot

Automated Minecraft Village Builder Bot using Mineflayer. Build entire villages with chat commands via WorldEdit schematics.

**Status:** Active Development | **Version:** 2.x | **License:** MIT

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
cp .env.example .env
# Edit .env with your server details
docker-compose up -d
```

### Local

```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
npm install
cp .env.example .env
npm start
```

---

## Features

- ✅ **Mineflayer Bot** - Minecraft 1.20.1 protocol support
- ✅ **Chat Commands** - Build structures via in-game chat
- ✅ **WorldEdit Schematics** - Load and build from .schem files
- ✅ **Docker Support** - Easy containerized deployment
- ✅ **Configurable** - Environment-based configuration
- ✅ **Error Recovery** - Automatic reconnection and error handling
- ✅ **Logging** - Detailed logs for debugging

---

## Installation

### Requirements

- Node.js 16+ LTS
- Docker & Docker Compose (optional)
- Minecraft Server 1.20.1
- ~200MB disk space

### Docker Setup

1. **Clone repository:**
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
```

2. **Configure environment:**
```bash
cp .env.example .env
nano .env
```

3. **Start container:**
```bash
docker-compose up -d
```

4. **View logs:**
```bash
docker-compose logs -f bot
```

### Local Setup

1. **Clone and install:**
```bash
git clone https://github.com/derlemue/mc-village-bot.git
cd mc-village-bot
npm install
```

2. **Configure:**
```bash
cp .env.example .env
nano .env
```

3. **Start bot:**
```bash
npm start
```

4. **Development mode with hot reload:**
```bash
npm run dev
```

---

## Configuration

### Environment Variables (.env)

```env
# Minecraft Server
MC_HOST=localhost
MC_PORT=25565
MC_USERNAME=VillageBuilder
MC_PASSWORD=           # Leave empty for offline mode
MC_VERSION=1.20.1

# Bot Settings
BOT_LOG_LEVEL=info     # debug, info, warn, error
BOT_AUTO_RESPAWN=true
BOT_RECONNECT=true
BOT_RECONNECT_DELAY=5000

# Schematic Settings
SCHEM_FOLDER=./schematics
SCHEM_AUTO_LOAD=true

# Performance
BOT_TICK_RATE=20       # Server ticks per second
BOT_BLOCK_DELAY=100    # Milliseconds between block placements
```

### Schematics Folder Structure

Place your WorldEdit schematics in the `schematics/` folder:

```
schematics/
├── house.schem
├── farm.schem
├── bridge.schem
└── converted/
    ├── house.js
    ├── farm.js
    └── bridge.js
```

---

## Usage

### Chat Commands

Connect to the Minecraft server and use these commands in chat:

#### Basic Commands

| Command | Description |
|---------|-------------|
| `!help` | Show available commands |
| `!ping` | Check bot connection status |
| `!pos` | Show bot's current position |
| `!status` | Show bot status and info |

#### Building Commands

| Command | Example | Description |
|---------|---------|-------------|
| `!build <schematic>` | `!build house` | Build schematic at current position |
| `!build <name> <x> <y> <z>` | `!build farm 100 64 200` | Build at specific coordinates |
| `!cancel` | `!cancel` | Cancel current build operation |

#### Schematic Commands

| Command | Example | Description |
|---------|---------|-------------|
| `!list` | `!list` | List available schematics |
| `!convert <file>` | `!convert house.schem` | Convert .schem to .js format |

#### Admin Commands

| Command | Description |
|---------|-------------|
| `!stop` | Stop bot gracefully |
| `!reload` | Reload configuration |
| `!debug` | Toggle debug mode |

### Example Workflow

1. **Export schematic in WorldEdit:**
```
//save my_house
```

2. **Place file in schematics folder:**
```bash
cp my_house.schem ./schematics/
```

3. **Convert schematic:**
```
!convert my_house.schem
```

4. **Build in Minecraft:**
```
!build my_house 100 64 200
```

5. **Watch the magic happen!** ✨

---

## Project Structure

```
mc-village-bot/
├── src/
│   ├── index.js              # Entry point
│   ├── bot.js                # Main bot class
│   ├── commands.js           # Command handler
│   ├── schematic.js          # Schematic parser
│   ├── logger.js             # Logging utility
│   └── config.js             # Configuration manager
├── tools/
│   ├── convert.js            # Schematic converter
│   └── validate.js           # Schematic validator
├── schematics/               # Schematic files (user-managed)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Development

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature develop

# Make changes and commit
git add .
git commit -m "feat: add awesome feature"

# Push to origin
git push origin feature/my-feature

# Create Pull Request on GitHub
```

### Local Development

```bash
# Install dependencies
npm install

# Start in watch mode
npm run dev

# Run tests (if available)
npm test

# Format code
npm run format
```

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation update
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `test:` Test addition/update

Example: `git commit -m "feat: add batch building support"`

### Useful Commands

```bash
# View logs from Docker container
docker-compose logs -f bot

# Execute command in container
docker-compose exec bot npm run convert-schematics

# Rebuild container
docker-compose build --no-cache

# Clean up everything
docker-compose down -v
```

---

## Troubleshooting

### Bot won't connect

```bash
# Check if server is reachable
ping localhost

# Verify port is open
netstat -an | grep 25565

# Check environment variables
cat .env | grep MC_

# View detailed logs
docker-compose logs -f bot
# or locally:
npm start 2>&1 | grep -i error
```

### Schematic conversion fails

```bash
# Verify file format
file schematics/my_house.schem

# Check file size (should be < 10 MB)
ls -lh schematics/my_house.schem

# Try manual conversion with debug
node tools/convert.js schematics/my_house.schem --debug

# Check converted folder
ls -la schematics/converted/
```

### Bot disconnects during build

```bash
# Increase block placement delay
# In .env: BOT_BLOCK_DELAY=150

# Check server logs for issues
# Check network connection stability

# Verify bot has enough space
# Check if chunks are loading properly
```

### Memory/Performance issues

```bash
# Monitor resource usage
docker stats

# Reduce block placement speed
# In .env: BOT_BLOCK_DELAY=200

# Increase chunk load wait time
# In .env: BOT_CHUNK_LOAD_WAIT=2000

# Check available RAM
free -h
```

### Docker issues

```bash
# Rebuild container
docker-compose build

# Remove and recreate
docker-compose down
docker-compose up -d

# Check container logs
docker-compose logs --tail=50 bot

# Inspect running processes
docker-compose exec bot ps aux
```

---

## Resources

- [Mineflayer Documentation](https://github.com/PrismarineJS/mineflayer)
- [Minecraft Protocol](https://wiki.vg/)
- [WorldEdit Documentation](https://enginehub.org/worldedit/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

## Support & Community

- **Issues:** [GitHub Issues](https://github.com/derlemue/mc-village-bot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/derlemue/mc-village-bot/discussions)
- **Pull Requests:** Contributions welcome!

---

## License

MIT License - See LICENSE file for details

---

**Happy Building! 🏗️**

*For the latest updates, visit: https://github.com/derlemue/mc-village-bot*
