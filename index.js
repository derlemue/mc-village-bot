// index.js - KOMPLETT GEFIXT MIT VOLLSTÄNDIGER BUILD-LOOP

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
      const villageManager = new VillageManager(builder);
      const streetBuilder = new StreetBuilder(bot, villageManager);
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
            // ✅ Validiere Input
            if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(count)) {
              bot.chat('❌ Ungültige Koordinaten oder Anzahl!');
              bot.chat('Verwendung: !build <x> <y> <z> [template] [count]');
              global.GLOBAL_IS_BUILDING = false;
              return;
            }

            const templateData = templateLoader.getTemplate(templateName);
            if (!templateData) {
              bot.chat('❌ Template nicht gefunden: ' + templateName);
              global.GLOBAL_IS_BUILDING = false;
              return;
            }

            console.log(`[Index] 🎯 BUILD-BEFEHL: ${count}x ${templateName} ab (${x},${y},${z})`);
            
            const village = villageManager.findOrCreateVillage(x, y, z);
            let successCount = 0;
            let previousBuilding = null;

            for (let i = 0; i < count && global.GLOBAL_IS_BUILDING; i++) {
              console.log(`[Index] 🔢 Gebäude ${i + 1}/${count}`);
              
              // ✅ KRITISCH: Nutze Builder zur Position-Validierung
              console.log(`[Index] 🔍 Suche valide Position ohne Straßen-Konflikt...`);
              const pos = villageManager.findFreePosition(village, templateData.width, templateData.depth);
              
              if (!pos) {
                console.log(`[Index] ❌ Keine valide Position nach Versuchen gefunden`);
                bot.chat(`❌ Keine valide Position für ${templateData.name} - keine freie Fläche ohne Straßen!`);
                break;
              }

              const building = {
                x: pos.x, 
                y: y, 
                z: pos.z, 
                width: templateData.width,
                depth: templateData.depth, 
                height: templateData.height,
                name: `${templateData.name} #${i+1}`,
                doorPos: templateData.doorPos || { x: Math.floor(templateData.width / 2), z: 0 }
              };

              console.log(`[Index] 📍 Building Position: ${pos.x}, ${y}, ${pos.z}`);
              bot.chat(`🚶 Zu ${building.name}...`);
              await movement.moveToBuilding(building);
              if (!global.GLOBAL_IS_BUILDING) {
                console.log(`[Index] ⏹️ BUILD GESTOPPT von Spieler`);
                break;
              }

              bot.chat(`🏗️ ${building.name} (${i+1}/${count})`);
              console.log(`[Index] 🧹 Bereite Fläche vor...`);
              await terrainPreparer.prepareBuildingArea(building);

              console.log(`[Index] 🚧 Baue Gebäude...`);
              const result = await builder.buildBuilding(building, templateData);
              
              // ✅ Nur weitermachen wenn Build erfolgreich
              if (result && result.status === 'success') {
                console.log(`[Index] ✅ Gebäude erfolgreich gebaut!`);
                villageManager.addBuildingToVillage(village, building);
                
                // ✅ Update StreetBuilder mit neuesten Villages
                streetBuilder.villages = villageManager.villages;
                console.log('[Index] 🔄 StreetBuilder villages reloaded');
                
                successCount++;

                // ✅ ERSTES GEBÄUDE: Straße zum Zentrum
                if (successCount === 1) {
                  console.log(`[Index] 🏘️ ERSTES GEBÄUDE: Baue Straße zum Village-Zentrum`);
                  try {
                    await streetBuilder.buildStreetToVillageCentrum(y, building, village);
                    console.log(`[Index] ✅ Straße zu Zentrum gebaut`);
                    bot.chat(`✅ Straße zu Zentrum gebaut`);
                  } catch (err) {
                    console.error('[Index] ❌ Fehler bei Zentrum-Straße:', err.message, err.stack);
                    bot.chat(`⚠️ Fehler bei Zentrum-Straße: ${err.message}`);
                  }
                  
                  try {
                    await streetBuilder.buildLanternPosts(y, building);
                    console.log(`[Index] ✅ Laternen um ${building.name} gebaut`);
                    bot.chat(`✅ Laternen um ${building.name} gebaut`);
                  } catch (lanternErr) {
                    console.error('[Index] ❌ Laternen Fehler:', lanternErr.message, lanternErr.stack);
                    bot.chat(`⚠️ Laternen Fehler: ${lanternErr.message}`);
                  }
                } 
                // ✅ WEITERE GEBÄUDE: Straße zum vorherigen
                else if (previousBuilding) {
                  console.log(`[Index] 🛣️ STARTE Straßenbau: ${previousBuilding.name} -> ${building.name}`);
                  try {
                    await streetBuilder.buildStreetToBuilding(y, previousBuilding, building);
                    console.log(`[Index] ✅ Straße gebaut`);
                    bot.chat(`✅ Straße: ${previousBuilding.name} → ${building.name}`);
                  } catch (streetErr) {
                    console.error('[Index] ❌ Straßenbau Fehler:', streetErr.message, streetErr.stack);
                    bot.chat(`⚠️ Straßenbau Fehler: ${streetErr.message}`);
                  }
                  
                  try {
                    await streetBuilder.buildLanternPosts(y, building);
                    console.log(`[Index] ✅ Laternen um ${building.name} gebaut`);
                    bot.chat(`✅ Laternen um ${building.name} gebaut`);
                  } catch (lanternErr) {
                    console.error('[Index] ❌ Laternen Fehler:', lanternErr.message, lanternErr.stack);
                    bot.chat(`⚠️ Laternen Fehler: ${lanternErr.message}`);
                  }
                } 
                else {
                  console.log(`[Index] ⏭️ Gebäude ${building.name} ohne Straße (Fehler vorher?)`);
                }

                previousBuilding = building;
                bot.chat(`✅ ${building.name} komplett!`);
                
                // ✅ Zurück zum Start wenn noch mehr Gebäude
                if (global.GLOBAL_IS_BUILDING && i < count - 1) {
                  console.log(`[Index] 🏠 Gehe zurück zum Start`);
                  bot.chat('🏠 Zurück...');
                  await movement.moveBackToStart();
                  
                  // Kurze Pause vor nächstem Gebäude
                  await new Promise(r => setTimeout(r, 2000));
                }
              } 
              // ✅ Build fehlgeschlagen - verschiebe Position und versuche erneut
              else {
                console.log(`[Index] ❌ Gebäude-Build fehlgeschlagen: ${result?.message || 'Unbekannter Fehler'}`);
                bot.chat(`⚠️ Position ungültig - versuche nächste Position...`);
                i--; // Versuch nochmal mit neuer Position
                
                // Limit: nicht endlos versuchen
                if (i < -10) {
                  console.log(`[Index] 🛑 Zu viele Fehlversuche - breche ab`);
                  bot.chat(`❌ Zu viele fehlgeschlagene Versuche - breche ab`);
                  break;
                }
              }
            }
            
            console.log(`[Index] 🎉 FERTIG: ${successCount}/${count} Gebäude gebaut`);
            bot.chat(`🎉 ${successCount}/${count} fertig!`);
          } catch (err) {
            console.error('[Build Error]:', err.message, err.stack);
            bot.chat('❌ Build Fehler: ' + err.message);
          } finally {
            global.GLOBAL_IS_BUILDING = false;
            console.log(`[Index] 🏁 Build-Loop beendet`);
          }
        }
      });
    } catch (err) {
      console.error('[Spawn Error]:', err.message, err.stack);
    }
  });
}

connectBot();
