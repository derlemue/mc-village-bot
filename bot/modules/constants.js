// modules/constants.js
const CONSTANTS = {
  BUILD_DELAY: 50,
  ATTACK_RANGE: 8,
  ATTACK_COOLDOWN: 1000,
  ROAD_BLOCK: 'bricks',
  FILL_BLOCK: 'deepslate_tiles', // ✅ Geändert zu deepslate_tiles
  LANTERN_BLOCK: 'lantern',
  LANTERN_BASE: 'stone_bricks',
  AREA_PADDING: 10,
  BUILD_SPACING: 10,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  
  // Straßenparameter
  ROAD_WIDTH_STRAIGHT: 2,
  ROAD_WIDTH_DIAGONAL: 4,
  ROAD_OVERLAP: 2,
  ROAD_AIR_HEIGHT: 4,
  
  // Datenbank
  DATA_DIR: require('path').join(__dirname, '../data'),
  BUILDINGS_DB_FILE: require('path').join(__dirname, '../data/buildings.json'),
  VILLAGES_DB_FILE: require('path').join(__dirname, '../data/villages.json'),
  
  // Chunk-Laden
  CHUNK_LOAD_RADIUS: 4 // +2 in jede Richtung = 4 Chunks Radius
};

module.exports = CONSTANTS;
