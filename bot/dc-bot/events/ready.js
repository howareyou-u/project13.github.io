const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const inviteTracker = require('../utils/inviteTracker');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    // Mensaje en consola
    console.log('='.repeat(40));
    console.log(`🚀 Bot conectado como ${client.user.tag}`);
    console.log(`📊 Presente en ${client.guilds.cache.size} servidores`);
    console.log(`💬 ${client.commands?.size || 0} comandos de texto cargados`);
    console.log(`⚡ ${client.slashCommands?.size || 0} comandos slash registrados`);
    console.log('='.repeat(40));

    // Establecer estado del bot
    client.user.setPresence({
      activities: [{ name: `!help | ${client.guilds.cache.size} servers`, type: 0 }],
      status: 'online'
    });

    // Nota: Se ha deshabilitado el envío de mensajes de estado a cada servidor
    // para evitar spam al iniciar. Si quieres volver a habilitarlo, reactiva
    // el bloque que construye y envía el embed de estado en este archivo.

    // Cargar configuración (si se necesita en el futuro)
    const configPath = path.join(__dirname, '..', 'data', 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
      }
    }

    // Initialize invite tracker for welcome invite detection
    try {
      await inviteTracker.init(client);
      console.log('✅ Invite tracker inicializado');
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar invite tracker:', e.message);
    }
  }
};