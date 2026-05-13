const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.json');

const storage = {
  getData() {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading from storage, initializing empty:', err);
      const empty = { agencies: [], clients: [], volunteers: [], appointments: [], inventory: [] };
      this.saveData(empty);
      return empty;
    }
  },

  saveData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  },

  // Helper method to get the next sequence ID
  getNextId(collectionName, idField) {
    const data = this.getData();
    const items = data[collectionName] || [];
    if (items.length === 0) return 1;
    const maxId = Math.max(...items.map(item => item[idField] || 0));
    return maxId + 1;
  }
};

// Simple in-memory simulation of sqlite connection callback/initialization for minimal breaking changes elsewhere.
console.log('Loaded JSON Data Store storage engine.');

module.exports = storage;
