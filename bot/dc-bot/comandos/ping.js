const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  enabled: true,
  description: 'Muestra la latencia del bot',

  // Slash command definition
  slashCommand: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra la latencia del bot')
    .toJSON(),

  // Text command handler (prefix: !)
  async execute(message, args) {
    const sent = await message.reply('🏓 Calculando ping...');
    const pingTime = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit(`🏓 Pong!\nLatencia: ${pingTime}ms\nAPI Latencia: ${Math.round(message.client.ws.ping)}ms`);
  },

  // Slash command handler
  async slashExecute(interaction) {
    await interaction.reply({ content: '🏓 Calculando ping...' });
    try {
      const sentPing = await interaction.fetchReply();
      const pingTime = sentPing.createdTimestamp - interaction.createdTimestamp;
      await interaction.editReply(`🏓 Pong!\nLatencia: ${pingTime}ms\nAPI Latencia: ${Math.round(interaction.client.ws.ping)}ms`);
    } catch (e) {
      console.error('Error calculando ping:', e);
      await interaction.editReply(`🏓 Pong!\nAPI Latencia: ${Math.round(interaction.client.ws.ping)}ms`);
    }
  }
};