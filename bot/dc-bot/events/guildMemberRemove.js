const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member) {
    try {
      const guild = member.guild;

      // Intentar cargar configuración desde MongoDB (si está configurada)
      let gcfg = null;
      try {
        const db = require('..').db || require('../db');
        if (db && typeof db.getGuildConfig === 'function') {
          const cfgFromDb = await db.getGuildConfig(guild.id);
          if (cfgFromDb) gcfg = cfgFromDb;
        }
      } catch (e) {
        // ignore DB errors and fall back to file
        console.warn('DB config read failed, falling back to file:', e.message || e);
        gcfg = null;
      }

      // Fallback: read local config file
      if (!gcfg) {
        const configPath = path.join(__dirname, '..', 'data', 'config.json');
        let cfg = {};
        try { cfg = JSON.parse(await fs.readFile(configPath, 'utf8')); } catch(e) { cfg = {}; }
        gcfg = cfg[guild.id];
      }

      if (!gcfg || !gcfg.farewell || !gcfg.farewell.enabled) return;

      const f = gcfg.farewell;
      if (f.channel) {
        const ch = await guild.channels.fetch(f.channel).catch(() => null);
        if (ch && ch.send) {
          const color = f.colorLeave || '#FF6961';
          const message = f.message || '{user} nos ha abandonado :(';
          const description = message.replace(/{user}/g, member.toString());
          
          const embed = new EmbedBuilder()
            .setTitle('👋 Despedida')
            .setDescription(description)
            .setColor(color)
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'Usuario', value: `${member.user.tag} (${member.id})`, inline: true })
            .setTimestamp();
          await ch.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error en guildMemberRemove handler:', error);
    }
  }
};
