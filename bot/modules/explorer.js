const { GoalBlock } = require('mineflayer-pathfinder').goals;
const utils = require('./utils');
const fs = require('fs');
const path = require('path');
const { saveState } = require('./persistence');

const EXPLORATION_DATA_FILE = path.join(__dirname, '../data/explored.json');
const EXPLORATION_RADIUS = parseInt(process.env.EXPLORATION_RADIUS) || 6000;

let visitedChunks = new Set();
let explorationInterval = null;

const https = require('https');
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1443074301178675220/-4Mbe-6WsJ_K3Ttz1VhX6mKvWFkTaiiwk-bOLPRKZ6E5AyOdL1SCEMExObyWnncF2BLO';

function sanitizeContent(content) {
  if (typeof content !== 'string') content = String(content);
  if (!content || typeof content !== 'string') content = '[EMPTY]';
  content = content.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!content.length) content = '[EMPTY]';
  content = content.replace(/"/g, '\'');
  return content.slice(0, 2000);
}

function sendDiscordWebhook(message) {
  const safeContent = sanitizeContent(message);
  const dataObj = { content: safeContent };
  const data = JSON.stringify(dataObj);
  const url = new URL(DISCORD_WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'MinecraftVillageBot'
    }
  };
  const req = https.request(options, res => {
    let body = '';
    res.on('data', chunk => { body += chunk });
    res.on('end', () => {
      console.log('Discord Webhook response:', res.statusCode, body);
    });
  });
  req.on('error', error => {
    console.error('Fehler beim Senden des Discord Webhooks:', error);
  });
  req.write(data);
  req.end();
}

async function sendStatus(bot, message) {
  bot.whisper(process.env.AUTHORIZED_USER, message);
  sendDiscordWebhook(message);
}

module.exports = {
  async startExploring(bot) {
    await sendStatus(bot, '🗺️ Starte Kartenerkundung');
    global.botState.isExploring = true;
    global.botState.currentTask = 'exploring';
    saveState(global.botState);

    this.loadExploredChunks();
    const spawnPos = bot.entity.position.clone();

    // Sofort einen ersten Zielwechsel erzwingen
    setTimeout(() => {
      this.exploreNextLocation(bot, spawnPos);
    }, 1000);

    explorationInterval = setInterval(async () => {
      if (!global.botState.isExploring) {
        this.stopExploring(bot);
        return;
      }
      try {
        await this.exploreNextLocation(bot, spawnPos);
      } catch (error) {
        console.error('Erkundungsfehler:', error);
      }
    }, 5000);
  },

  stopExploring(bot) {
    sendStatus(bot, '⏸️ Stoppe Erkundung');
    global.botState.isExploring = false;
    global.botState.currentTask = null;
    saveState(global.botState);

    if (explorationInterval) {
      clearInterval(explorationInterval);
      explorationInterval = null;
    }

    bot.pathfinder.setGoal(null);
    this.saveExploredChunks();
  },

  async exploreNextLocation(bot, spawnPos) {
    const currentPos = bot.entity.position;
    const chunkKey = this.getChunkKey(currentPos);

    if (!visitedChunks.has(chunkKey)) {
      visitedChunks.add(chunkKey);
      global.botState.exploredChunks = visitedChunks.size;
      saveState(global.botState);
    }

    let nextTarget = this.calculateNextExplorationPoint(currentPos, spawnPos);

    // FALLBACK: Bei identischem Ziel springe 64 Blöcke in X-Richtung weiter
    if (nextTarget.x === currentPos.x && nextTarget.z === currentPos.z) {
      nextTarget.x += 64;
      nextTarget.z += 0;
    }

    console.log(`Explorerbot Ziel / Teleport: ${nextTarget.x}, ${nextTarget.y}, ${nextTarget.z}`);

    const distanceFromSpawn = Math.sqrt(
      Math.pow(nextTarget.x - spawnPos.x, 2) +
      Math.pow(nextTarget.z - spawnPos.z, 2)
    );

    if (distanceFromSpawn > EXPLORATION_RADIUS) {
      nextTarget.x = spawnPos.x;
      nextTarget.z = spawnPos.z;
      visitedChunks.clear();
      global.botState.exploredChunks = 0;
      saveState(global.botState);
    }

    try {
      if (bot.game && bot.game.gameMode === 1) {
        bot.entity.position.set(nextTarget.x, nextTarget.y || currentPos.y, nextTarget.z);
      } else {
        const goal = new GoalBlock(nextTarget.x, nextTarget.y || currentPos.y, nextTarget.z);
        bot.pathfinder.setGoal(goal);
      }
    } catch {
      // Fehler ignorieren
    }
  },

  // Neue Zielberechnung: Spiral/Ringbewegung um den Spawn!
  calculateNextExplorationPoint(currentPos, spawnPos) {
    const step = 64; // Schrittweite pro Ziel (Blöcke)
    const count = visitedChunks.size;
    const angle = (count * 45) % 360; // Jede Runde 45 Grad weiter
    const rad = angle * Math.PI / 180;
    const radius = 32 + Math.floor(count / 8) * step;
    return {
      x: Math.floor(spawnPos.x + radius * Math.cos(rad)),
      y: currentPos.y,
      z: Math.floor(spawnPos.z + radius * Math.sin(rad))
    };
  },

  getChunkKey(position) {
    const chunkX = Math.floor(position.x / 16);
    const chunkZ = Math.floor(position.z / 16);
    return `${chunkX},${chunkZ}`;
  },

  loadExploredChunks() {
    try {
      if (fs.existsSync(EXPLORATION_DATA_FILE)) {
        const data = fs.readFileSync(EXPLORATION_DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        visitedChunks = new Set(parsed.chunks || []);
        global.botState.exploredChunks = visitedChunks.size;
        saveState(global.botState);
      }
    } catch (error) {
      // Fehler ignorieren
    }
  },

  saveExploredChunks() {
    try {
      const data = {
        chunks: Array.from(visitedChunks),
        lastUpdate: new Date().toISOString()
      };
      fs.writeFileSync(EXPLORATION_DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      // Fehler ignorieren
    }
  }
};
