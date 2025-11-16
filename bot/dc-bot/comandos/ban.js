const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logSystem = require('../utils/logSystem');

module.exports = {
  name: 'ban',
  enabled: true,
  description: 'Banea a un usuario del servidor',
  
  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor')
    .addStringOption(option =>
      option.setName('usuario')
        .setDescription('ID o mención del usuario que quieres banear')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del baneo')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),

  // Text command handler (prefix: !)
  async execute(message, args) {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ No tienes permisos para banear.');
    }

    if (!args[0]) {
      return message.reply('❌ Debes mencionar al usuario o proporcionar su ID.');
    }

    let user;
    const mentionedUser = message.mentions.users.first();
    
    if (mentionedUser) {
      user = mentionedUser;
    } else {
      try {
        user = await message.client.users.fetch(args[0]);
      } catch (error) {
        return message.reply('❌ ID de usuario inválida. Usa una mención o una ID válida.');
      }
    }

    if (!user) {
      return message.reply('❌ No pude encontrar al usuario.');
    }

    const reason = args.slice(mentionedUser ? 1 : 1).join(' ') || 'Sin razón especificada';

    try {
      await message.guild.members.ban(user, { reason });
      
      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(message.guild, 'BAN', {
        user: user,
        moderator: message.author,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        await message.reply({ embeds: [confirmationEmbed] });
      } else {
        await message.reply('✅ Usuario baneado, pero no se pudo enviar el log.');
      }
    } catch (error) {
      console.error(error);
      message.reply('❌ No pude banear a ese usuario.');
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

      // Intentar obtener el usuario
      let user;
      try {
        user = await interaction.client.users.fetch(userId);
      } catch (error) {
        return interaction.reply({
          content: '❌ No pude encontrar ningún usuario con esa ID.',
          ephemeral: true
        });
      }

      // Obtener información del usuario antes del baneo si está en el servidor
      const member = interaction.guild.members.cache.get(user.id);
      const roles = member ? member.roles.cache.map(r => r.name).filter(n => n !== '@everyone').join(', ') : 'Ninguno';
      
      // Intentar banear al usuario
      await interaction.guild.members.ban(user.id, { reason });

      // Enviar log y obtener embed de confirmación
      const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'BAN', {
        user: user,
        moderator: interaction.user,
        reason: reason,
        caseId: Date.now().toString(36)
      });

      if (confirmationEmbed) {
        // Agregar información de roles al embed de confirmación si estaba en el servidor
        if (member) {
          confirmationEmbed.addFields({ 
            name: '👥 Roles previos', 
            value: roles || 'Ninguno' 
          });
        }
        
        await interaction.reply({ embeds: [confirmationEmbed] });
      } else {
        await interaction.reply({ 
          content: '✅ Usuario baneado, pero no se pudo enviar el log.',
          ephemeral: true 
        });
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ 
        content: '❌ No pude banear a ese usuario. ' + 
                 'Verifica que tenga los permisos necesarios y que el usuario pueda ser baneado.', 
        ephemeral: true 
      });
    }
  }
};
