class Movement {
  constructor(bot) {
    this.bot = bot;
    console.log('[Movement] ✅ TP + LANGSAAMES Freiräumen');
  }

  async moveToPosition(targetX, targetY, targetZ) {
    console.log(`[Movement] 🚶 TP zu (${targetX},${targetY},${targetZ})`);
    
    // 1. TELEPORT
    this.bot.chat(`/tp ${targetX} ${targetY} ${targetZ}`);
    await new Promise(r => setTimeout(r, 1500));  // ✅ LÄNGER warten!
    console.log(`[Movement] ✅ Bei (${Math.floor(this.bot.entity.position.x)},${Math.floor(this.bot.entity.position.y)},${Math.floor(this.bot.entity.position.z)})`);
  }

  async moveToBuilding(building) {
    const centerX = building.x + Math.floor(building.width / 2);
    const centerZ = building.z + Math.floor(building.depth / 2);
    await this.moveToPosition(centerX, building.y + 1, centerZ);  // ✅ y+1!
  }

  async moveBackToStart() {
    const pos = this.bot.entity.position;
    console.log('[Movement] 🏠 Zurück zum Start');
    await this.moveToPosition(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
  }

  stop() {
    console.log('[Movement] 🛑 Gestoppt!');
  }
}

module.exports = Movement;
