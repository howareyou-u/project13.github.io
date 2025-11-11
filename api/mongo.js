const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set — MongoDB operations will be skipped');
    return null;
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'discord-bot');
  return db;
}

async function getCollection(name = 'guildConfigs') {
  const database = await connect();
  if (!database) return null;
  return database.collection(name);
}

module.exports = {
  connect,
  getCollection,
  _close: async () => client ? client.close() : null
};
