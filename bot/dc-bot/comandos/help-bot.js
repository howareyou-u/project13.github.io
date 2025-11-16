const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'help-bot',
  enabled: true,
  description: 'Muestra todos los comandos disponibles',

  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('help-bot')
    .setDescription('Muestra todos los comandos disponibles')
    .toJSON(),

  buildHelpEmbed() {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📚 Guía de Comandos del Bot')
      .setDescription('Selecciona una categoría en el menú desplegable para ver los comandos disponibles')
      .setFooter({ text: 'Usa ! o / antes de cada comando | Bot por tu servidor' })
      .setTimestamp(new Date());

    const select = new StringSelectMenuBuilder()
      // include the command name in the customId so the central interaction router can find the handler
      .setCustomId('help-bot:help-menu')
      .setPlaceholder('Selecciona una categoría')
      .addOptions([
        { label: 'Administración', value: 'admin', description: 'Comandos de moderación y administración' },
        { label: 'Tickets', value: 'tickets', description: 'Abrir/cerrar/reclamar tickets' },
        { label: 'Utilidad', value: 'utils', description: 'Comandos prácticos como ping' },
        { label: 'Menús', value: 'menus', description: 'Comandos para crear y administrar menús' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    return { helpEmbed, row };
  },

  async sendHelpMessage(message) {
    const { helpEmbed, row } = this.buildHelpEmbed();
    return message.reply({ embeds: [helpEmbed], components: [row] });
  },

  async sendHelpInteraction(interaction) {
    const { helpEmbed, row } = this.buildHelpEmbed();
    return interaction.reply({ embeds: [helpEmbed], components: [row], ephemeral: true });
  },

  async handleSelect(interaction) {
    const selected = interaction.values[0];
    let embed;
    switch (selected) {
      case 'admin':
        embed = new EmbedBuilder()
          .setTitle('🛡️ Administración')
          .setColor(0xE74C3C)
          .setDescription('Comandos de moderación y administración')
          .addFields(
            { name: 'ban', value: '`!ban @usuario [razón]` — Banea a un usuario', inline: false },
            { name: 'kick', value: '`!kick @usuario [razón]` — Expulsa a un usuario', inline: false },
            { name: 'mute', value: '`!mute @usuario` — Silencia/Des-silencia a un usuario', inline: false },
            { name: 'unban', value: '`!unban ID` — Desbanea a un usuario por ID', inline: false }
          );
        break;
      case 'tickets':
        embed = new EmbedBuilder()
          .setTitle('🎫 Tickets')
          .setColor(0x2B65EC)
          .setDescription('Comandos y acciones relacionadas con tickets')
          .addFields(
            { name: 'Crear Ticket', value: '`!ticket [razón]` o seleccionar opción del menú — Crea un ticket privado', inline: false },
            { name: 'Cerrar', value: '`!close-ticket` o botón 🔒 — Cierra el ticket y ofrece reabrir/borrar', inline: false },
            { name: 'Reclamar', value: '`!claim-ticket` o botón 🎯 — Reclama el ticket para atenderlo', inline: false },
            { name: 'Menús', value: 'Usa `/menu` o `!menu` para crear embeds con menús editables por admins', inline: false }
          );
        break;
      case 'utils':
        embed = new EmbedBuilder()
          .setTitle('� Utilidad')
          .setColor(0x3498DB)
          .setDescription('Comandos útiles y de consulta')
          .addFields(
            { name: 'ping', value: '`!ping` / `/ping` — Muestra la latencia del bot', inline: false },
            { name: 'help', value: '`!help-bot` / `/help-bot` — Muestra este menú de ayuda', inline: false }
          );
        break;
      case 'menus':
        embed = new EmbedBuilder()
          .setTitle('📝 Menús')
          .setColor(0x9B59B6)
          .setDescription('Crear y administrar menús dinámicos en embeds')
          .addFields(
            { name: 'Crear', value: '`/menu create` — Crea un embed con un menú desplegable', inline: false },
            { name: 'Agregar', value: '`/menu add` — Agrega una opción al menú existente', inline: false },
            { name: 'Remover', value: '`/menu remove` — Remueve una opción por su valor', inline: false },
            { name: 'Listar', value: '`/menu list` — Lista las opciones actuales del menú', inline: false }
          );
        break;
      default:
        embed = new EmbedBuilder().setDescription('Opción no reconocida.');
    }

    try {
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      try { return await interaction.reply({ embeds: [embed], ephemeral: true }); } catch (e) { return; }
    }
  }
};