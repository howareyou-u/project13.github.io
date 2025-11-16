const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logSystem = require('../utils/logSystem');

module.exports = {
  name: 'unban',
  enabled: true,
  description: 'Desbanea a un usuario por su ID',

  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Desbanea a un usuario por su ID')
    .addStringOption(option =>
      option.setName('usuario')
        .setDescription('ID o mención del usuario a desbanear')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del desbaneo')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),

  // Text command handler (prefix: !)
  async execute(message, args) {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ No tienes permisos para desbanear.');
    }

    if (!args[0]) {
      return message.reply('❌ Debes mencionar al usuario o proporcionar su ID.');
    }

    let userId;
    const mentionedUser = message.mentions.users.first();
    
    if (mentionedUser) {
      userId = mentionedUser.id;
    } else {
      // Limpiar la ID de caracteres extra
      userId = args[0].replace(/[<@!>]/g, '');
      
      // Verificar si la ID es válida
      if (!/^\d+$/.test(userId)) {
        return message.reply('❌ ID de usuario inválida. Usa una mención o una ID válida.');
      }
    }

    try {
      const banList = await message.guild.bans.fetch();
      const ban = banList.find(ban => ban.user.id === userId);
      
      if (!ban) {
        return message.reply('❌ Este usuario no está baneado.');
      }

      const reason = args.slice(1).join(' ') || 'Sin razón especificada';
      await message.guild.members.unban(userId, reason);

      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(message.guild, 'UNBAN', {
        user: ban.user,
        moderator: message.author,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        await message.reply({ embeds: [confirmationEmbed] });
      } else {
        await message.reply('✅ Usuario desbaneado, pero no se pudo enviar el log.');
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ No pude desbanear a ese usuario. Verifica la ID.');
    }
  },

  // Slash command handler
  async slashExecute(interaction) {
    const userInput = interaction.options.getString('usuario');
    const reason = interaction.options.getString('razon') || 'Sin razón especificada';
    
    try {
      // Limpiar la ID de caracteres extra
      const userId = userInput.replace(/[<@!>]/g, '');
      
      // Verificar si la ID es válida
      if (!/^\d+$/.test(userId)) {
        return interaction.reply({
          content: '❌ ID de usuario inválida. Usa una mención o una ID válida.',
          ephemeral: true
        });
      }

      // Verificar si el usuario está baneado
      const banList = await interaction.guild.bans.fetch();
      const ban = banList.find(ban => ban.user.id === userId);
      
      if (!ban) {
        return interaction.reply({ 
          content: '❌ Este usuario no está baneado.', 
          ephemeral: true 
        });
      }

      await interaction.guild.members.unban(userId, reason);

      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'UNBAN', {
        user: ban.user,
        moderator: interaction.user,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        // Agregar información del baneo previo al embed
        if (ban.reason) {
          confirmationEmbed.addFields({ 
            name: '📝 Razón del baneo previo', 
            value: ban.reason 
          });
        }
        
        await interaction.reply({ embeds: [confirmationEmbed] });
      } else {
        await interaction.reply({ 
          content: '✅ Usuario desbaneado, pero no se pudo enviar el log.',
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: '❌ No pude desbanear a ese usuario. Verifica que la ID sea válida.', 
        ephemeral: true 
      });
    }
  }
};
