const builder = require('./builder');
const explorer = require('./explorer');
const utils = require('./utils');
const { saveState } = require('./persistence');
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

  // Debug-Ausgabe!
  console.log("Webhook_BODY:", data);

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

async function notify(bot, message) {
//  bot.whisper(process.env.AUTHORIZED_USER, message);
  sendDiscordWebhook(message);
}

module.exports = {
  async handleCommand(bot, username, message) {
    const args = message.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    try {
      switch(command) {
        case '!build':
          await this.handleBuild(bot, args);
          break;
        case '!explore':
          await this.handleExplore(bot);
          break;
        case '!stop':
          console.log('!stop wurde im Chat erkannt.');
          await this.handleStop(bot);
          break;
        case '!status':
          await this.handleStatus(bot);
          break;
        case '!help':
          this.showHelp(bot);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Fehler bei Befehlsausführung:', error);
      await notify(bot, `❌ Fehler: ${error.message}`);
    }
  },

  async handleBuild(bot, args) {
    if (global.botState.isBuilding) {
      await notify(bot, '⚠️ Ich baue bereits!');
      return;
    }
    if (global.botState.isExploring) explorer.stopExploring(bot);
    if (args.length < 4) {
      await notify(bot, '❌ Verwendung: !build <x> <y> <z> <anzahl>');
      return;
    }
    const x = parseInt(args[1]);
    const y = parseInt(args[2]);
    const z = parseInt(args[3]);
    let amount;
    if (args.length >= 5) {
      amount = parseInt(args[4]);
      if (isNaN(amount) || amount < 2) amount = 2;
      if (amount > 250) amount = 250;
    }
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      await notify(bot, '❌ Ungültige Koordinaten!');
      return;
    }
//    await notify(bot, `🏗️ Starte Dorfbau bei (${x}, ${y}, ${z}) mit ${amount || 'Zufall'} Gebäuden`);
    global.botState.isBuilding = true;
    global.botState.isExploring = false;
    global.botState.currentTask = 'building';
    global.botState.buildCoords = { x, y, z };
    saveState(global.botState);
    try {
      await builder.buildVillage(bot, x, y, z, amount);
      await notify(bot, '✅ Dorf fertig gebaut!');
      global.botState.isBuilding = false;
      global.botState.buildCoords = null;
      saveState(global.botState);

      global.botState.isExploring = true;
      global.botState.currentTask = 'exploring';
      saveState(global.botState);
      await explorer.startExploring(bot);
    } catch (error) {
      await notify(bot, `❌ Baufehler: ${error.message}`);
      global.botState.isBuilding = false;
      saveState(global.botState);
    }
  },

  async handleExplore(bot) {
    if (global.botState.isExploring) {
      await notify(bot, '⚠️ Ich erkunde bereits!');
      return;
    }
    if (global.botState.isBuilding) {
      await notify(bot, '⚠️ Ich baue gerade. Warte bis ich fertig bin!');
      return;
    }
//    await notify(bot, '🗺️ Starte Kartenerkundung...');
    global.botState.isExploring = true;
    global.botState.currentTask = 'exploring';
    saveState(global.botState);

    console.log("Handle Explore: explorer.startExploring wird aufgerufen!");
    await explorer.startExploring(bot);
  },

  async handleStop(bot) {
    console.log('handleStop() gestartet!');
    if (!global.botState.isBuilding && !global.botState.isExploring) {
      await notify(bot, '⚠️ Ich mache gerade nichts.');
      return;
    }
    if (global.botState.isBuilding) {
      global.botState.isBuilding = false;
      global.botState.buildCoords = null;
      global.botState.buildIndex = null;
      global.botState.buildHouseCount = null;
      saveState(global.botState);
    }
    if (global.botState.isExploring) {
      console.log('Explorer wirklich stoppen...');
      explorer.stopExploring(bot);
      global.botState.isExploring = false;
      saveState(global.botState);
    }
    bot.pathfinder.setGoal(null);
    global.botState.currentTask = null;
    saveState(global.botState);
    await notify(bot, '✅ Gestoppt.');
  },

  async handleStatus(bot) {
    const uptime = Math.floor((Date.now() - global.botState.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const pos = bot.entity.position;
    await notify(bot, '=== Bot Status ===');
    await notify(bot, `Position: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`);
    await notify(bot, `Aufgabe: ${global.botState.currentTask || 'Keine'}`);
    await notify(bot, `Baue: ${global.botState.isBuilding ? 'Ja' : 'Nein'}`);
    await notify(bot, `Erkunde: ${global.botState.isExploring ? 'Ja' : 'Nein'}`);
    await notify(bot, `Erkundete Chunks: ${global.botState.exploredChunks}`);
    await notify(bot, `Laufzeit: ${hours}h ${minutes}m ${seconds}s`);
  },

  showHelp(bot) {
    notify(bot, '=== Village Builder Bot ===');
    notify(bot, '!build <x> <y> <z> <anzahl> - Baue Dorf mit 2-75 Gebäuden am Mittelpunkt');
    notify(bot, '!explore - Starte Kartenerkundung');
    notify(bot, '!stop - Stoppe aktuelle Aufgabe');
    notify(bot, '!status - Zeige Bot-Status');
    notify(bot, '!help - Zeige diese Hilfe');
  }
};

