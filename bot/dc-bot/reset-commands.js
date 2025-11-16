const { REST, Routes } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ Error: Faltan variables de entorno. Asegúrate de tener un archivo .env con DISCORD_TOKEN, CLIENT_ID y GUILD_ID');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

// Eliminar comandos antiguos
(async () => {
  try {
    console.log('Eliminando comandos antiguos...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );
    console.log('Comandos eliminados con éxito.');
  } catch (error) {
    console.error('Error al eliminar comandos:', error);
  }
  process.exit();
})();