const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock, GoalNear } = goals;
const fs = require('fs');
const path = require('path');

const chatHandler = require('./modules/chatHandler');
const builder = require('./modules/builder');
const explorer = require('./modules/explorer');
const utils = require('./modules/utils');

const STATE_FILE = path.join(__dirname, '../data/botState.json');
const TOKEN_FILE = path.join(__dirname, '../data/mcToken.json');

function ensureStateDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveState(state) {
  try {
    ensureStateDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Fehler beim Speichern von botState.json:', e.message);
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Fehler beim Laden von botState.json:', e.message);
  }
  return null;
}

// --- Token Management ---
function saveTokenToFile(accessToken, refreshToken = null) {
  try {
    ensureStateDir();
    const tokenData = {
      accessToken,
      refreshToken,
      savedAt: Date.now(),
      expiresAt: Date.now() + (3600 * 1000) // 1 Stunde Gültigkeit
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
    console.log('✅ Token gespeichert');
  } catch (e) {
    console.error('Fehler beim Speichern des Tokens:', e.message);
  }
}

function loadTokenFromFile() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      return tokenData;
    }
  } catch (e) {
    console.warn('Fehler beim Laden des Tokens:', e.message);
  }
  return null;
}

function isTokenValid(tokenData) {
  if (!tokenData || !tokenData.accessToken) return false;
  if (!tokenData.expiresAt) return false;
  
  const now = Date.now();
  const isExpired = now > tokenData.expiresAt;
  
  if (isExpired) {
    console.warn('⚠️ Token ist abgelaufen. Neuer Login erforderlich.');
    return false;
  }
  
  console.log('✅ Token ist noch gültig');
  return true;
}

// Doppelstart im selben Prozess verhindern
if (global.__VILLAGE_BOT_RUNNING__) {
  console.log('⚠️ index.js bereits geladen, zweiten Start im selben Prozess abgebrochen');
  return;
}
global.__VILLAGE_BOT_RUNNING__ = true;

// --- Token-Validierung vor Bot-Start ---
let accessToken = process.env.MC_TOKEN;
let refreshToken = process.env.MC_REFRESH_TOKEN || null;

const savedTokenData = loadTokenFromFile();

if (savedTokenData && isTokenValid(savedTokenData)) {
  accessToken = savedTokenData.accessToken;
  refreshToken = savedTokenData.refreshToken;
  console.log('🔑 Verwende gespeicherten Token');
} else if (!accessToken) {
  console.error('❌ Kein Token vorhanden und kein gültiger Token gespeichert!');
  console.error('Bitte setze MC_TOKEN in .env oder führe neuen Login durch');
  process.exit(1);
} else {
  console.log('🔑 Verwende Token aus .env');
  saveTokenToFile(accessToken, refreshToken);
}

const config = {
  host: process.env.MC_SERVER || 'localhost',
  port: parseInt(process.env.MC_PORT) || 25565,
  username: process.env.MC_USERNAME || 'BuilderBot',
  version: process.env.MC_VERSION || '1.20.1',
  auth: 'microsoft',
  tokens: {
    accessToken: accessToken,
    refreshToken: refreshToken
  }
};

console.log('🤖 Minecraft Village Builder Bot startet...');
console.log(`📡 Verbinde mit ${config.host}:${config.port} als ${config.username}`);

const bot = mineflayer.createBot(config);
bot.loadPlugin(pathfinder);

global.botState = loadState() || {
  isBuilding: false,
  isExploring: false,
  currentTask: null,
  buildCoords: null,
  buildProgress: 0,
  exploredChunks: 0,
  startTime: Date.now(),
  buildHouseCount: null,
  buildIndex: null
};

// Custom-Event für !build
bot.on('buildVillage', (x, y, z, n) => {
  builder.buildVillage(bot, x, y, z, n);
});

bot.once('spawn', async () => {
  const mcData = require('minecraft-data')(bot.version);
  const MovementsClass = require('mineflayer-pathfinder').Movements;
  const movements = new MovementsClass(bot, mcData);

  movements.scafoldingBlocks = [];
  movements.allow1by1towers = false;
  movements.canDig = false;
  movements.allowFreeMotion = true;

  bot.pathfinder.setMovements(movements);

  builder.setupChatHandler(bot);

  if (process.env.AUTHORIZED_USER) {
    bot.whisper(process.env.AUTHORIZED_USER, 'Ich bin bereit. Nutze !help für Befehle.');
  }

  if (global.botState.isBuilding && global.botState.buildCoords) {
    if (process.env.AUTHORIZED_USER) {
      bot.whisper(
        process.env.AUTHORIZED_USER,
        `Fortsetzen: Dorfbau bei (${global.botState.buildCoords.x}, ${global.botState.buildCoords.y}, ${global.botState.buildCoords.z}) - Gebäude ${global.botState.buildIndex}/${global.botState.buildHouseCount}`
      );
    }
  }

  console.log('✅ Bot vollständig eingerichtet');
});

bot.on('end', (reason) => {
  console.log(`\n⚠️ Bot-Verbindung beendet: ${reason}`);
  console.log('🔄 Starte Neuverbindung in 10 Sekunden...\n');
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

bot.on('error', (err) => {
  console.error('❌ Bot-Fehler:', err);
  
  // Token-spezifische Fehlerbehandlung
  if (err.message && err.message.includes('Invalid access token')) {
    console.error('🔑 Access Token ungültig - bitte neu anmelden');
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
      console.log('🗑️ Ungültiger Token gelöscht');
    }
  }
});

// Periodische Token-Aktualisierung (alle 55 Minuten)
setInterval(() => {
  const tokenData = loadTokenFromFile();
  if (tokenData && !isTokenValid(tokenData)) {
    console.warn('⏰ Token läuft bald ab - bitte neu anmelden');
  }
}, 55 * 60 * 1000);

console.log('✅ Bot-Prozess gestartet');
