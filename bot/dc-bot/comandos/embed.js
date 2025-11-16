const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const embedsPath = path.join(__dirname, '..', 'data', 'embeds.json');

module.exports = {
  name: 'embed',
  description: 'Gestiona los embeds del sistema de tickets',
  enabled: true,

  slashCommand: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Gestiona los embeds del sistema de tickets')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Crea un nuevo embed para tickets')
        .addStringOption(o => 
          o.setName('nombre')
            .setDescription('Nombre único para identificar el embed')
            .setRequired(true))
        .addStringOption(o => 
          o.setName('titulo')
            .setDescription('Título del embed')
            .setRequired(true))
        .addStringOption(o => 
          o.setName('descripcion')
            .setDescription('Descripción del embed')
            .setRequired(true))
        .addStringOption(o => 
          o.setName('color')
            .setDescription('Color del embed en formato HEX (#FF0000)')
            .setRequired(false))
        .addStringOption(o => 
          o.setName('imagen')
            .setDescription('URL de la imagen para el embed')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('info')
        .setDescription('Muestra información de un embed por su ID de mensaje')
        .addStringOption(o =>
          o.setName('mensaje_id')
            .setDescription('ID del mensaje del embed')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista todos los embeds disponibles'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  async loadEmbeds() {
    try {
      const data = await fs.readFile(embedsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  },

  async saveEmbeds(embeds) {
    await fs.writeFile(embedsPath, JSON.stringify(embeds, null, 2));
  },

  async slashExecute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch(subcommand) {
      case 'create': {
        const nombre = interaction.options.getString('nombre');
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const color = interaction.options.getString('color') || '#2B65EC';
        const imagen = interaction.options.getString('imagen');

        const embeds = await this.loadEmbeds();

        // Verificar si ya existe un embed con ese nombre
        const existingEmbed = Object.values(embeds).find(e => e.name.toLowerCase() === nombre.toLowerCase());
        if (existingEmbed) {
          return interaction.reply({
            content: '❌ Ya existe un embed con ese nombre. Por favor, elige otro nombre.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(titulo)
          .setDescription(descripcion)
          .setColor(color);

        if (imagen) embed.setImage(imagen);

        const sent = await interaction.channel.send({ embeds: [embed] });

        embeds[sent.id] = {
          name: nombre,
          messageId: sent.id,
          channelId: sent.channelId,
          guildId: interaction.guildId,
          title: titulo,
          description: descripcion,
          color: color,
          image: imagen,
          createdBy: interaction.user.id,
          createdAt: Date.now()
        };

        await this.saveEmbeds(embeds);

        return interaction.reply({
          content: `✅ Embed "${nombre}" creado exitosamente.\nID del mensaje: ${sent.id}`,
          ephemeral: true
        });
      }

      case 'info': {
        const messageId = interaction.options.getString('mensaje_id');
        const embeds = await this.loadEmbeds();
        const embed = embeds[messageId];

        if (!embed) {
          return interaction.reply({
            content: '❌ No se encontró ningún embed con ese ID de mensaje.',
            ephemeral: true
          });
        }

        const infoEmbed = new EmbedBuilder()
          .setTitle(`ℹ️ Información del Embed: ${embed.name}`)
          .setColor(embed.color)
          .addFields(
            { name: 'Nombre', value: embed.name, inline: true },
            { name: 'ID del Mensaje', value: embed.messageId, inline: true },
            { name: 'Canal', value: `<#${embed.channelId}>`, inline: true },
            { name: 'Título', value: embed.title },
            { name: 'Descripción', value: embed.description },
            { name: 'Color', value: embed.color, inline: true },
            { name: 'Creado por', value: `<@${embed.createdBy}>`, inline: true },
            { name: 'Fecha de creación', value: new Date(embed.createdAt).toLocaleString(), inline: true }
          );

        if (embed.image) {
          infoEmbed.setImage(embed.image);
        }

        return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
      }

      case 'list': {
        const embeds = await this.loadEmbeds();
        
        if (Object.keys(embeds).length === 0) {
          return interaction.reply({
            content: '📝 No hay embeds registrados.',
            ephemeral: true
          });
        }

        const listEmbed = new EmbedBuilder()
          .setTitle('📋 Lista de Embeds')
          .setColor('#2B65EC')
          .setDescription(
            Object.values(embeds)
              .map(e => `**${e.name}**\n> ID: ${e.messageId}\n> Canal: <#${e.channelId}>`)
              .join('\n\n')
          );

        return interaction.reply({ embeds: [listEmbed], ephemeral: true });
      }
    }
  }
};