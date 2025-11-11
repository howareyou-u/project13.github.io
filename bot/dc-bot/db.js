const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // No DB configured — caller should handle null
    return null;
  }
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'discord-bot');
  return db;
}

async function getGuildConfig(guildId) {
  const database = await connect();
  if (!database) return null;
  const col = database.collection('guildConfigs');
  const doc = await col.findOne({ guildId });
  return doc?.config || null;
}

async function saveGuildConfig(guildId, config) {
  const database = await connect();
  if (!database) throw new Error('No DB configured');
  const col = database.collection('guildConfigs');
  await col.updateOne({ guildId }, { $set: { guildId, config, updatedAt: new Date() } }, { upsert: true });
  return true;
}

module.exports = { connect, getGuildConfig, saveGuildConfig };
