require('dotenv').config();

const mineflayer = require('mineflayer');

global.GLOBAL_IS_BUILDING = false;
let currentBot = null;

// ✅ SAFER Module Loading mit Fallbacks
let TemplateLoader, Builder, TerrainPreparer, StreetBuilder, VillageManager, Movement;
try {
  TemplateLoader = require('./modules/templateLoader');
  Builder = require('./modules/builder');
  TerrainPreparer = require('./modules/terrain');
  StreetBuilder = require('./modules/streets');
  VillageManager = require('./modules/villageManager');
  Movement = require('./modules/movement');
  console.log('✅ Alle Module geladen');
} catch (err) {
  console.error('❌ Module Fehler:', err.message);
  console.log('📁 Verfügbare Dateien:', require('fs').readdirSync('./modules || ./'));
  process.exit(1);
}

async function connectBot() {
  console.log('🔄 Bot verbindet...');
  
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

  bot.once('spawn', async () => {
    console.log('[BOT] 🎮 Bereit!');
    console.log('[BOT] 📍 Position:', Math.floor(bot.entity.position.x), Math.floor(bot.entity.position.y), Math.floor(bot.entity.position.z));

    try {
      // ✅ SAFER Instance Creation
      const builder = new Builder(bot);
      const terrainPreparer = new TerrainPreparer(bot);
      const villageManager = new VillageManager();
      const streetBuilder = new StreetBuilder(bot, villageManager); // ✅ Fix: VillageManager-Referenz
      const movement = new Movement(bot);

      bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        console.log('[CHAT]', message);

        const parts = message.trim().split(' ');
        if (!parts[0].startsWith('!')) return;
        const command = parts[0].substring(1).toLowerCase();

        if (command === 'stop') {
          global.GLOBAL_IS_BUILDING = false;
          if (movement && movement.stop) movement.stop();
          bot.chat('🛑 BUILD GESTOPPT!');
          return;
        }

        if (command === 'templates') {
          try {
            bot.chat('📋 Templates: ' + templateLoader.getTemplateNames().join(', '));
          } catch (e) {
            bot.chat('❌ Templates Fehler');
          }
          return;
        }

        if (command === 'build' && !global.GLOBAL_IS_BUILDING) {
          global.GLOBAL_IS_BUILDING = true;
          const x = parseInt(parts[1]), y = parseInt(parts[2]), z = parseInt(parts[3]);
          const templateName = (parts[4] || 'kneipe').toLowerCase();
          const count = parseInt(parts[5]) || 1;

          try {
            const templateData = templateLoader.getTemplate(templateName);
            if (!templateData) {
              bot.chat('❌ Template nicht gefunden: ' + templateName);
              global.GLOBAL_IS_BUILDING = false;
              return;
            }

            const village = villageManager.findOrCreateVillage(x, y, z);
            let successCount = 0;
            let previousBuilding = null;

            for (let i = 0; i < count && global.GLOBAL_IS_BUILDING; i++) {
              const pos = villageManager.findFreePosition(village, templateData.width, templateData.depth);
              const building = {
                x: pos.x, y: y, z: pos.z, width: templateData.width,
                depth: templateData.depth, height: templateData.height,
                name: `${templateData.name} #${i+1}`,
                doorPos: templateData.doorPos || { x: Math.floor(templateData.width / 2), z: 0 }
              };

              bot.chat(`🚶 Zu ${building.name}...`);
              await movement.moveToBuilding(building);
              if (!global.GLOBAL_IS_BUILDING) break;

              bot.chat(`🏗️ ${building.name} (${i+1}/${count})`);
              await terrainPreparer.prepareBuildingArea(building);

              const result = await builder.buildBuilding(building, templateData);
              if (result && result.status === 'success') {
                // ✅ KRITISCH: SOFORT speichern
                villageManager.addBuildingToVillage(village, building);
                
                // ✅ StreetBuilder synchronisieren
                streetBuilder.villages = villageManager.villages;
                console.log('[Index] 🔄 StreetBuilder villages reloaded');
                
                successCount++;

                if (previousBuilding) {
                  bot.chat(`🛣️ Straße zu ${building.name}...`);
                  await streetBuilder.buildStreetToBuilding(y, previousBuilding, building);
                  await streetBuilder.buildLanternPosts(y, building);
                }

                previousBuilding = building;
                bot.chat(`✅ ${building.name}`);
                
                if (global.GLOBAL_IS_BUILDING && i < count - 1) {
                  bot.chat('🏠 Zurück...');
                  await movement.moveBackToStart();
                }
              }
            }
            bot.chat(`🎉 ${successCount}/${count} fertig!`);
          } catch (err) {
            console.error('[Build Error]:', err);
            bot.chat('❌ Build Fehler: ' + err.message);
          } finally {
            global.GLOBAL_IS_BUILDING = false;
          }
        }
      });
    } catch (err) {
      console.error('[Spawn Error]:', err);
    }
  });
}

connectBot();
