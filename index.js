require('dotenv').config();
const mineflayer = require('mineflayer');

// ✅ GLOBAL STOP-FLAG
global.GLOBAL_IS_BUILDING = false;
let currentBot = null;

const TemplateLoader = require('./modules/templateLoader');
const Builder = require('./modules/builder');
const TerrainPreparer = require('./modules/terrain');
const StreetBuilder = require('./modules/streets');
const VillageManager = require('./modules/villageManager');

async function connectBot() {
  const templateLoader = new TemplateLoader();
  const config = {
    host: process.env.MC_HOST || '46.224.3.29',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'cr4zy_chicken',
    version: process.env.MC_VERSION || false,
    auth: process.env.MC_AUTH || 'microsoft',
  };

  const bot = mineflayer.createBot(config);
  currentBot = bot;

  bot.on('login', () => console.log('[BOT] ✅ LOGIN'));
  bot.on('spawn', () => console.log('[BOT] ✅ SPAWNED'));
  bot.on('error', err => console.log('[BOT] ❌ ERROR:', err.message));
  bot.on('end', () => {
    console.log('[BOT] 🔌 DISCONNECTED');
    setTimeout(connectBot, 5000);
  });

  bot.once('spawn', () => {
    console.log('[BOT] 🎮 Bereit!');
    
    const builder = new Builder(bot);
    const terrainPreparer = new TerrainPreparer(bot);
    const streetBuilder = new StreetBuilder(bot);
    const villageManager = new VillageManager();

    bot.on('chat', async (username, message) => {
      if (username === bot.username) return;
      console.log('[CHAT]', message);

      const parts = message.trim().split(' ');
      if (!parts[0].startsWith('!')) return;
      const command = parts[0].substring(1).toLowerCase();

      if (command === 'stop') {
        global.GLOBAL_IS_BUILDING = false;
        bot.chat('🛑 BUILD GESTOPPT!');
        return;
      }

      if (command === 'build' && !global.GLOBAL_IS_BUILDING) {
        global.GLOBAL_IS_BUILDING = true;
        const x = parseInt(parts[1]), y = parseInt(parts[2]), z = parseInt(parts[3]);
        const templateName = (parts[4] || 'kneipe').toLowerCase();
        const count = parseInt(parts[5]) || 1;

        const templateData = templateLoader.getTemplate(templateName);
        if (!templateData) {
          bot.chat('❌ Template nicht gefunden');
          global.GLOBAL_IS_BUILDING = false;
          return;
        }

        try {
          const village = villageManager.findOrCreateVillage(x, y, z);
          let successCount = 0;

          for (let i = 0; i < count; i++) {
            if (!global.GLOBAL_IS_BUILDING) break;
            
            const pos = villageManager.findFreePosition(village, templateData.width, templateData.depth);
            const building = {
              x: pos.x, y, z: pos.z, width: templateData.width, 
              depth: templateData.depth, height: templateData.height,
              name: `${templateData.name} #${i+1}`,
              doorPos: templateData.doorPos || { x: Math.floor(templateData.width / 2), z: 0 }
            };

            bot.chat(`🏗️ ${building.name} (${i+1}/${count})`);
            
            await terrainPreparer.prepareBuildingArea(building);
            const result = await builder.buildBuilding(building, templateData);
            
            if (result.status === 'success') {
              villageManager.addBuildingToVillage(village, building);
              successCount++;
              if (successCount > 1) {
                const prevBuilding = village.buildings[successCount - 2];
                await streetBuilder.buildStreetToBuilding(y, prevBuilding, building);
              }
              await streetBuilder.buildLanternPosts(y, building);
              bot.chat(`✅ ${building.name}`);
            }
          }
          bot.chat(`🎉 ${successCount}/${count} fertig!`);
        } finally {
          global.GLOBAL_IS_BUILDING = false;
        }
      }
    });
  });
}

connectBot();
