require('dotenv').config();

const mineflayer = require('mineflayer');

const TemplateLoader = require('./modules/templateLoader');
const Builder = require('./modules/builder');
const TerrainPreparer = require('./modules/terrain');
const StreetBuilder = require('./modules/streets');
const VillageManager = require('./modules/villageManager');

console.log('[STARTUP] 🚀 Village Bot startet...');

async function connectBot(attempt = 1) {
  const templateLoader = new TemplateLoader();
  const maxAttempts = 5;
  
  const config = {
    host: process.env.MC_HOST || '46.224.3.29',
    port: parseInt(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'VillageBot1234',
    version: process.env.MC_VERSION || false,
    auth: process.env.MC_AUTH || 'microsoft',
    connectTimeout: 60000
  };

  console.log(`[CONNECT] Versuch ${attempt}/${maxAttempts}:`, config.username);

  const bot = mineflayer.createBot(config);
  let isBuilding = false;

  // DEBUG Events
  bot.on('login', () => console.log('[BOT] ✅ LOGIN'));
  bot.on('spawn', () => console.log('[BOT] ✅ SPAWNED'));
  bot.on('error', err => console.log('[BOT] ❌ ERROR:', err.message));
  bot.on('kicked', reason => console.log('[BOT] ⛔ KICKED:', reason));
  bot.on('end', () => {
    console.log('[BOT] 🔌 DISCONNECTED');
    if (attempt < maxAttempts && !isBuilding) {
      const delay = Math.min(1000 * attempt * 2, 10000); // Exponential Backoff
      console.log(`[CONNECT] ⏳ Wiederverbinden in ${delay/1000}s...`);
      setTimeout(() => connectBot(attempt + 1), delay);
    }
  });

  bot.once('spawn', () => {
    console.log('[BOT] 🎮 Bereit als:', bot.username);
    console.log('[BOT] 📍 Position:', 
      Math.floor(bot.entity.position.x), 
      Math.floor(bot.entity.position.y), 
      Math.floor(bot.entity.position.z)
    );
    
    const builder = new Builder(bot);
    const terrainPreparer = new TerrainPreparer(bot);
    const streetBuilder = new StreetBuilder(bot);
    const villageManager = new VillageManager();

    console.log('[MAIN] 🎮 Bot läuft! !templates | !build x y z template [count]');

    bot.on('chat', async (username, message) => {
      if (username === bot.username) return;
      console.log('[CHAT] <' + username + '>', message);

      const parts = message.trim().split(' ');
      if (!parts[0].startsWith('!')) return;
      const command = parts[0].substring(1).toLowerCase();

      if (command === 'stop') {
        if (isBuilding) {
          isBuilding = false;
          bot.chat('🛑 BUILD GESTOPPT!');
        }
        return;
      }

      if (command === 'templates') {
        bot.chat('📋 Templates: ' + templateLoader.getTemplateNames().join(', '));
        return;
      }

      if (command === 'build' && !isBuilding) {
        const x = parseInt(parts[1]), y = parseInt(parts[2]), z = parseInt(parts[3]);
        let templateName = (parts[4] || 'kneipe').toLowerCase();
        const count = parseInt(parts[5]) || 1;

        if (templateName === 'random') {
          templateName = templateLoader.getTemplateNames()[Math.floor(Math.random() * templateLoader.getTemplateNames().length)];
        }

        const templateData = templateLoader.getTemplate(templateName);
        if (!templateData) {
          bot.chat('❌ Template nicht gefunden: ' + templateName);
          return;
        }

        isBuilding = true;
        const builtBuildings = [];
        let successCount = 0;

        try {
          const village = villageManager.findOrCreateVillage(x, y, z);

          for (let i = 0; i < count && isBuilding; i++) {
            const pos = villageManager.findFreePosition(village, templateData.width, templateData.depth);
            const doorPos = templateData.doorPos || { x: Math.floor(templateData.width / 2), z: 0 };
            
            const building = {
              x: pos.x, y, z: pos.z, width: templateData.width, 
              depth: templateData.depth, height: templateData.height,
              name: `${templateData.name} #${i+1}`,
              doorPos: doorPos
            };

            bot.chat(`🏗️ ${building.name} (${i+1}/${count})`);
            
            await terrainPreparer.prepareBuildingArea(building);
            const result = await builder.buildBuilding(building, templateData);
            
            if (result.status === 'success') {
              villageManager.addBuildingToVillage(village, building);
              builtBuildings.push(building);
              successCount++;

              if (successCount > 1) {
                const prevBuilding = builtBuildings[successCount - 2];
                await streetBuilder.buildStreetToBuilding(y, prevBuilding, building);
              }
              
              await streetBuilder.buildLanternPosts(y, building);
              bot.chat(`✅ ${building.name}`);
            }
          }
          bot.chat(`🎉 ${successCount}/${count} fertig!`);
        } finally {
          isBuilding = false;
        }
      }
    });
  });
}

connectBot();
