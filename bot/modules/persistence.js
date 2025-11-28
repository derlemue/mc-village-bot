const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/botState.json');

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return null;
}

module.exports = { saveState, loadState };
