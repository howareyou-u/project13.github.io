const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const inviteTracker = require('../utils/inviteTracker');

module.exports = {
  name: 'guildMemberAdd',
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

        if (!gcfg || !gcfg.welcome) return; // nothing configured

        const w = gcfg.welcome;

      // Send welcome embed
      if (w.channel) {
        const ch = await guild.channels.fetch(w.channel).catch(() => null);
        if (ch && ch.send) {
          const color = w.colorWelcome || '#2B65EC';
          const embed = new EmbedBuilder()
            .setTitle('🎉 Bienvenido')
            .setDescription(`${member} se ha unido al servidor.`)
            .setColor(color)
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'Usuario', value: `${member.user.tag} (${member.id})`, inline: true })
            .setTimestamp();
          await ch.send({ embeds: [embed] }).catch(() => {});
        }
      }

      // Detect invite used and send invite report if configured
      if (w.inviteChannel) {
        try {
          const used = await inviteTracker.detectInviteUsed(guild);
          if (used) {
            const ch = await guild.channels.fetch(w.inviteChannel).catch(() => null);
            if (ch && ch.send) {
              const color = w.colorInvite || '#00FF00';
              const inviter = used.inviter;
              const embed = new EmbedBuilder()
                .setTitle('🔗 Invitación usada')
                .setDescription(`${member} se unió usando el enlace\n> Código: \`${used.code}\`\n> Invitador: ${inviter ? inviter.tag : 'Desconocido'}`)
                .setColor(color)
                .addFields({ name: 'Usos', value: `${used.uses || 0}`, inline: true })
                .setTimestamp();
              await ch.send({ embeds: [embed] }).catch(() => {});
            }
          }
        } catch (e) { /* ignore invite detection errors */ }
      }
    } catch (error) {
      console.error('Error en guildMemberAdd handler:', error);
    }
  }
};
