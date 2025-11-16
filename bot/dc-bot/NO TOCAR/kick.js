const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logSystem = require('../utils/logSystem');

module.exports = {
  name: 'kick',
  enabled: true,
  description: 'Expulsa a un usuario del servidor',

  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario que quieres expulsar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón de la expulsión')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .toJSON(),

  // Text command handler (prefix: !)
  async execute(message, args) {
    if (!message.member.permissions.has('KickMembers')) {
      return message.reply('❌ No tienes permisos para expulsar usuarios.');
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply('❌ Debes mencionar al usuario que quieres expulsar.');
    }

    const reason = args.slice(1).join(' ') || 'Sin razón especificada';

    try {
      const member = await message.guild.members.fetch(user.id);
      await member.kick(reason);

      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(message.guild, 'KICK', {
        user: user,
        moderator: message.author,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        await message.reply({ embeds: [confirmationEmbed] });
      } else {
        await message.reply('✅ Usuario expulsado, pero no se pudo enviar el log.');
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ No pude expulsar a ese usuario. Verifica mis permisos y la jerarquía de roles.');
    }
  },

  // Slash command handler
  async slashExecute(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    
    try {
      const member = await interaction.guild.members.fetch(user.id);
      
      // Guardar roles antes de expulsar
      const roles = member.roles.cache.map(r => r.name).filter(n => n !== '@everyone').join(', ');
      
      await member.kick(reason);

      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'KICK', {
        user: user,
        moderator: interaction.user,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        // Agregar información de roles al embed
        if (roles) {
          confirmationEmbed.addFields({
            name: '👥 Roles previos',
            value: roles
          });
        }
        
        await interaction.reply({ embeds: [confirmationEmbed] });
      } else {
        await interaction.reply({
          content: '✅ Usuario expulsado, pero no se pudo enviar el log.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: '❌ No pude expulsar a ese usuario. Verifica mis permisos y la jerarquía de roles.', 
        ephemeral: true 
      });
    }
  }
};