const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logSystem = require('../utils/logSystem');

module.exports = {
  name: 'mute',
  enabled: true,
  description: 'Silencia a un usuario',

  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario que quieres silenciar')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .toJSON(),

  // Text command handler (prefix: !)
  async execute(message, args) {
    if (!message.member.permissions.has('MuteMembers')) {
      return message.reply('❌ No tienes permisos para silenciar usuarios.');
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Debes mencionar al usuario que quieres silenciar.');
    }

    try {
      const member = await message.guild.members.fetch(user.id);
      const muteRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'mute');

      if (!muteRole) {
        return message.reply('❌ No existe un rol llamado "Mute" en este servidor.');
      }

      if (member.roles.cache.has(muteRole.id)) {
        await member.roles.remove(muteRole);
        
        // Enviar log y obtener embed de confirmación
        const confirmationEmbed = await logSystem.sendLog(message.guild, 'UNMUTE', {
          user: user,
          moderator: message.author,
          caseId: Date.now().toString(36)
        });

        if (confirmationEmbed) {
          await message.reply({ embeds: [confirmationEmbed] });
        } else {
          await message.reply('🔊 Usuario des-silenciado, pero no se pudo enviar el log.');
        }
      } else {
        await member.roles.add(muteRole);
        
        // Enviar log y obtener embed de confirmación
        const confirmationEmbed = await logSystem.sendLog(message.guild, 'MUTE', {
          user: user,
          moderator: message.author,
          caseId: Date.now().toString(36)
        });

        if (confirmationEmbed) {
          await message.reply({ embeds: [confirmationEmbed] });
        } else {
          await message.reply('🔇 Usuario silenciado, pero no se pudo enviar el log.');
        }
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ No pude silenciar a ese usuario. Verifica mis permisos y la jerarquía de roles.');
    }
  },

  // Slash command handler
  async slashExecute(interaction) {
    const user = interaction.options.getUser('usuario');
    try {
      const member = await interaction.guild.members.fetch(user.id);
      const muteRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'mute');
      
      if (!muteRole) {
        return interaction.reply({ content: '❌ No existe un rol "Mute" en este servidor.', ephemeral: true });
      }

      if (member.roles.cache.has(muteRole.id)) {
        await member.roles.remove(muteRole);
        
        // Enviar log y obtener embed de confirmación
        const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'UNMUTE', {
          user: user,
          moderator: interaction.user,
          caseId: Date.now().toString(36)
        });

        if (confirmationEmbed) {
          await interaction.reply({ embeds: [confirmationEmbed] });
        } else {
          await interaction.reply({
            content: '🔊 Usuario des-silenciado, pero no se pudo enviar el log.',
            ephemeral: true
          });
        }
      } else {
        await member.roles.add(muteRole);
        
        // Enviar log y obtener embed de confirmación
        const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'MUTE', {
          user: user,
          moderator: interaction.user,
          caseId: Date.now().toString(36)
        });

        if (confirmationEmbed) {
          await interaction.reply({ embeds: [confirmationEmbed] });
        } else {
          await interaction.reply({
            content: '🔇 Usuario silenciado, pero no se pudo enviar el log.',
            ephemeral: true
          });
        }
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: '❌ No pude silenciar a ese usuario.', ephemeral: true });
    }
  }
};