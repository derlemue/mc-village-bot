module.exports = {
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  formatCoords(coords) {
    if (!coords) return '(unbekannt)';
    return `${coords.x}, ${coords.y}, ${coords.z}`;
  },

  // Flächen-Koordinaten für ein Gebäude generieren (breite/länge um Mittelpunkt)
  areaCoords(centerX, centerY, centerZ, width, length) {
    return {
      x1: centerX - Math.floor(width / 2),
      x2: centerX + Math.floor(width / 2),
      z1: centerZ - Math.floor(length / 2),
      z2: centerZ + Math.floor(length / 2),
      y: centerY
    };
  }
};
