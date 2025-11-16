const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EMBEDS_FILE = path.join(DATA_DIR, 'ticketEmbeds.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
}

function loadEmbeds() {
  ensureDataDir();
  if (!fs.existsSync(EMBEDS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(EMBEDS_FILE, 'utf8') || '{}'); } catch (e) { return {}; }
}

function saveEmbeds(obj) {
  ensureDataDir();
  fs.writeFileSync(EMBEDS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

/**
 * Parse color string to a value accepted by EmbedBuilder.setColor
 * Accepts:
 *  - '#RRGGBB' or 'RRGGBB' (hex)
 *  - '0xRRGGBB'
 *  - 'rgba(r,g,b,a)' or 'rgb(r,g,b)'
 * Returns integer (0xRRGGBB) or original string if can't parse (EmbedBuilder accepts '#RRGGBB' too).
 */
function parseColor(input) {
  if (!input) return null;
  input = input.trim();
  // HEX with # or without
  const hexMatch = input.match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    return parseInt(hexMatch[1], 16);
  }
  const hex0x = input.match(/^0x([0-9a-fA-F]{6})$/);
  if (hex0x) return parseInt(hex0x[1], 16);

  // rgba or rgb
  const rgba = input.match(/rgba?\\s*\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})(?:\\s*,\\s*(0|0?\\.\\d+|1(?:\\.0)?))?\\s*\\)/i);
  if (rgba) {
    const r = Math.max(0, Math.min(255, parseInt(rgba[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgba[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgba[3], 10)));
    return (r << 16) + (g << 8) + b;
  }

  // fallback: return null (do not set color)
  return null;
}

module.exports = {
  name: 'ticket',
  enabled: true,
  
  async autocomplete(interaction) {
    try {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.respond([]);
        return;
      }
    
      const focusedOption = interaction.options.getFocused(true);
      const menuManager = require('../utils/menuManager');
      let choices = [];

      // Log para debug
      console.log('Autocomplete for:', focusedOption.name, 'Value:', focusedOption.value);

      if (focusedOption.name === 'nombre' || focusedOption.name === 'embed') {
        const embeds = loadEmbeds();
        const guildEmbeds = embeds[interaction.guildId] || {};
        choices = Object.entries(guildEmbeds).map(([name, data]) => ({
          name: `${name} - ${data.title || 'Sin título'}`,
          value: name
        }));

      } else if (focusedOption.name === 'menu_id') {
        const menus = await menuManager.getMenusForGuild(interaction.guildId);
        choices = Object.entries(menus).map(([id, data]) => ({
          name: `${id} (${data.buttonText || 'Sin texto'})`,
          value: id
        }));
      } else if (focusedOption.name === 'panel') {
        choices = [
          { name: '🛠️ Soporte Técnico', value: 'soporte' },
          { name: '❓ Dudas Generales', value: 'dudas' },
          { name: '🐛 Reporte de Bugs', value: 'bugs' },
          { name: '💡 Sugerencias', value: 'sugerencias' },
          { name: '🎮 Problemas de Juego', value: 'juego' },
          { name: '📝 Otros', value: 'otros' }
        ];
      }

      // Filtrar las opciones basadas en el valor ingresado
      const filtered = focusedOption.value
        ? choices.filter(choice => 
            choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
        : choices;

      console.log('Responding with choices:', filtered.length);
      
      // Enviar las opciones filtradas (máximo 25)
      await interaction.respond(filtered.slice(0, 25));
    } catch (error) {
      console.error('Error in autocomplete:', error);
      await interaction.respond([]);
    }
  },

  slashCommand: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Crea un ticket para un usuario (solo admins)')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario destinatario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del ticket').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('embed')
        .setDescription('Guarda un embed plantilla para usar en tickets')
        .addStringOption(o => o.setName('nombre').setDescription('Nombre del embed (identificador)').setRequired(true))
        .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption(o => o.setName('miniatura').setDescription('URL de la miniatura').setRequired(false))
        .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(false))
        .addStringOption(o => o.setName('imagen').setDescription('URL de la imagen del embed').setRequired(false))
        .addStringOption(o => o.setName('footer').setDescription('Texto del footer').setRequired(false))
        .addStringOption(o => o.setName('footerimg').setDescription('URL de la imagen del footer').setRequired(false))
        .addStringOption(o => o.setName('color').setDescription('Color del embed (HEX como #RRGGBB o RRGGBB, o rgba(r,g,b,a))').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edita una plantilla de embed existente')
        .addStringOption(o => 
          o.setName('nombre')
            .setDescription('Nombre del embed a editar')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(false))
        .addStringOption(o => o.setName('miniatura').setDescription('URL de la miniatura').setRequired(false))
        .addStringOption(o => o.setName('descripcion').setDescription('Descripción').setRequired(false))
        .addStringOption(o => o.setName('imagen').setDescription('URL de la imagen del embed').setRequired(false))
        .addStringOption(o => o.setName('footer').setDescription('Texto del footer').setRequired(false))
        .addStringOption(o => o.setName('footerimg').setDescription('URL de la imagen del footer').setRequired(false))
        .addStringOption(o => o.setName('color').setDescription('Color del embed (HEX o rgba)').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('menu')
        .setDescription('Añade un menú de selección a un embed existente')
        .addStringOption(o => 
          o.setName('embed')
            .setDescription('ID del embed que obtuviste con /ticket list')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(o => 
          o.setName('menu_id')
            .setDescription('Identificador único para este menú')
            .setRequired(true))
        .addStringOption(o => 
          o.setName('boton_texto')
            .setDescription('Texto que aparecerá en el placeholder del menú')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('opciones')
        .setDescription('Añade una opción a un menú existente')
        .addStringOption(o => 
          o.setName('menu_id')
            .setDescription('Identificador del menú')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(o => 
          o.setName('panel')
            .setDescription('Panel al que se asociará esta opción')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(o => 
          o.setName('opcion_nombre')
            .setDescription('Nombre de la opción que aparecerá en el menú')
            .setRequired(true))
        .addStringOption(o => 
          o.setName('opcion_descripcion')
            .setDescription('Descripción de la opción en el menú')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('paneles')
        .setDescription('Gestiona los paneles disponibles')
        .addStringOption(o => 
          o.setName('nombre')
            .setDescription('Nombre del panel (servirá como identificador)')
            .setRequired(true)
            .addChoices(
              { name: '🛠️ Soporte Técnico', value: 'soporte' },
              { name: '❓ Dudas Generales', value: 'dudas' },
              { name: '🐛 Reporte de Bugs', value: 'bugs' },
              { name: '💡 Sugerencias', value: 'sugerencias' },
              { name: '🎮 Problemas de Juego', value: 'juego' },
              { name: '📝 Otros', value: 'otros' }
            )))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista los embeds o paneles disponibles')
        .addStringOption(o => 
          o.setName('tipo')
            .setDescription('Qué quieres listar')
            .setRequired(true)
            .addChoices(
              { name: '📝 Embeds', value: 'embed' },
              { name: '📋 Paneles', value: 'panel' }
            )))
    .toJSON(),

  async slashExecute(interaction) {
    const sub = interaction.options.getSubcommand();

    // Admin check: Require ManageGuild or Administrator
    const member = interaction.member;
    const isAdmin = member.permissions && (member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator));
    if (!isAdmin) return interaction.reply({ content: '❌ Necesitas permisos de administrador para usar este comando.', ephemeral: true });

    try {
      if (sub === 'create') {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';
        const guild = interaction.guild;

        // find or create category 'Tickets'
        let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets');
        if (!category) category = await guild.channels.create({ name: 'Tickets', type: ChannelType.GuildCategory });

        const cleanUsername = target.username.toLowerCase().replace(/[^a-z0-9]/g, '');
        const channelName = `ticket-${cleanUsername}-${Date.now().toString().slice(-4)}`;
        const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: category.id });

        // permissions
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
        await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });

        const staffRole = guild.roles.cache.find(r => /mod|staff|admin/i.test(r.name) || r.permissions.has(PermissionFlagsBits.ManageGuild));
        if (staffRole) await channel.permissionOverwrites.edit(staffRole.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });

        const embed = new EmbedBuilder()
          .setTitle('🎫 Ticket abierto')
          .setDescription(`Se ha abierto un ticket para ${target} por: ${reason}`)
          .addFields({ name: 'Creado por', value: `${interaction.user}`, inline: true }, { name: 'Para', value: `${target}`, inline: true })
          .setTimestamp();

        const closeBtn = new ButtonBuilder().setCustomId('close-ticket').setLabel('🔒 Cerrar').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(closeBtn);

        await channel.send({ content: `${target}`, embeds: [embed], components: [row] });
        return interaction.editReply({ content: `✅ Ticket creado: ${channel}`, ephemeral: true });
      }

      if (sub === 'embed') {
        // collect options
        const name = interaction.options.getString('nombre');
        const title = interaction.options.getString('titulo');
        const thumb = interaction.options.getString('miniatura');
        const desc = interaction.options.getString('descripcion');
        const image = interaction.options.getString('imagen');
        const footer = interaction.options.getString('footer');
        const footerimg = interaction.options.getString('footerimg');
        const colorRaw = interaction.options.getString('color');

        const colorVal = parseColor(colorRaw);

        const embeds = loadEmbeds();
        if (!embeds[interaction.guildId]) embeds[interaction.guildId] = {};
        embeds[interaction.guildId][name] = { title, thumb, desc, image, footer, footerimg, color: colorRaw || null, updatedAt: Date.now(), by: interaction.user.id };
        saveEmbeds(embeds);

        // Build the embed to send into the channel where command was used
        const emb = new EmbedBuilder();
        if (colorVal !== null) emb.setColor(colorVal);
        else if (colorRaw) {
          // if parsing failed but a string exists, try passing raw hex string (EmbedBuilder accepts '#RRGGBB')
          emb.setColor(colorRaw);
        }
        emb.setTitle(title || '')
        if (desc) emb.setDescription(desc);
        if (thumb) emb.setThumbnail(thumb);
        if (image) emb.setImage(image);
        if (footer || footerimg) emb.setFooter({ text: footer || '', iconURL: footerimg || undefined });
        emb.setTimestamp();

        // send to channel where command executed
        try {
          await interaction.channel.send({ embeds: [emb] });
        } catch (sendErr) {
          console.error('No se pudo enviar el embed al canal:', sendErr);
        }

        return interaction.reply({ content: `✅ Plantilla de embed '${name}' guardada y enviada en este canal.`, ephemeral: true });
      }

      if (sub === 'edit') {
        const name = interaction.options.getString('nombre');
        const title = interaction.options.getString('titulo');
        const thumb = interaction.options.getString('miniatura');
        const desc = interaction.options.getString('descripcion');
        const image = interaction.options.getString('imagen');
        const footer = interaction.options.getString('footer');
        const footerimg = interaction.options.getString('footerimg');
        const colorRaw = interaction.options.getString('color');

        const embeds = loadEmbeds();
        if (!embeds[interaction.guildId] || !embeds[interaction.guildId][name]) {
          return interaction.reply({ content: `❌ No existe una plantilla llamada '${name}' en este servidor.`, ephemeral: true });
        }

        const entry = embeds[interaction.guildId][name];
        if (title) entry.title = title;
        if (thumb !== null && thumb !== undefined) entry.thumb = thumb;
        if (desc !== null && desc !== undefined) entry.desc = desc;
        if (image !== null && image !== undefined) entry.image = image;
        if (footer !== null && footer !== undefined) entry.footer = footer;
        if (footerimg !== null && footerimg !== undefined) entry.footerimg = footerimg;
        if (colorRaw !== null && colorRaw !== undefined) entry.color = colorRaw;
        entry.updatedAt = Date.now();
        entry.by = interaction.user.id;

        saveEmbeds(embeds);
        return interaction.reply({ content: `✅ Plantilla '${name}' actualizada.`, ephemeral: true });
      }

      if (sub === 'menu') {
        const embedName = interaction.options.getString('embed');
        const menuId = interaction.options.getString('menu_id');
        const buttonText = interaction.options.getString('boton_texto');

        const menuManager = require('../utils/menuManager');
        
        try {
          const embeds = loadEmbeds();
          if (!embeds[interaction.guildId]?.[embedName]) {
            return interaction.reply({
              content: `❌ No existe el embed '${embedName}' en este servidor.`,
              ephemeral: true
            });
          }

          const menu = await menuManager.createMenu(
            interaction.guildId,
            embedName,
            menuId,
            buttonText
          );

          return interaction.reply({
            content: `✅ Menú '${menuId}' creado y asociado al embed '${embedName}'. Usa /ticket opciones para añadir opciones al menú.`,
            ephemeral: true
          });
        } catch (error) {
          return interaction.reply({
            content: `❌ Error al crear el menú: ${error.message}`,
            ephemeral: true
          });
        }
      }

      if (sub === 'opciones') {
        const menuId = interaction.options.getString('menu_id');
        const panel = interaction.options.getString('panel');
        const optionName = interaction.options.getString('opcion_nombre');
        const optionDesc = interaction.options.getString('opcion_descripcion');

        const menuManager = require('../utils/menuManager');
        
        try {
          const menu = await menuManager.addMenuOption(
            interaction.guildId,
            menuId,
            panel,
            optionName,
            optionDesc
          );

          // Actualizar el mensaje con el embed y el menú actualizado
          const menus = await menuManager.getMenusForGuild(interaction.guildId);
          const menuData = menus[menuId];

          if (menuData) {
            const embeds = loadEmbeds();
            const embedData = embeds[interaction.guildId][menuData.embedName];
            
            // Crear el embed
            const embed = new EmbedBuilder()
              .setTitle(embedData.title || '')
              .setDescription(embedData.desc || '');

            if (embedData.color) embed.setColor(parseColor(embedData.color));
            if (embedData.thumb) embed.setThumbnail(embedData.thumb);
            if (embedData.image) embed.setImage(embedData.image);
            if (embedData.footer || embedData.footerimg) {
              embed.setFooter({ 
                text: embedData.footer || '', 
                iconURL: embedData.footerimg 
              });
            }

            // Crear el menú de selección
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId(`ticket-menu-${menuId}`)
              .setPlaceholder(menuData.buttonText);

            // Añadir todas las opciones
            menuData.options.forEach(opt => {
              selectMenu.addOptions({
                label: opt.label,
                description: opt.description,
                value: opt.value
              });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Enviar o actualizar mensaje
            await interaction.channel.send({
              embeds: [embed],
              components: [row]
            });
          }

          return interaction.reply({
            content: `✅ Opción '${optionName}' añadida al menú '${menuId}'.`,
            ephemeral: true
          });
        } catch (error) {
          return interaction.reply({
            content: `❌ Error al añadir la opción: ${error.message}`,
            ephemeral: true
          });
        }
      }

      if (sub === 'paneles') {
        const panelName = interaction.options.getString('nombre');
        const menuManager = require('../utils/menuManager');
        
        try {
          const panel = await menuManager.createPanel(
            interaction.guildId,
            panelName
          );

          return interaction.reply({
            content: `✅ Panel '${panelName}' creado. Puedes usarlo al crear opciones de menú.`,
            ephemeral: true
          });
        } catch (error) {
          return interaction.reply({
            content: `❌ Error al crear el panel: ${error.message}`,
            ephemeral: true
          });
        }
      }

      if (sub === 'list') {
        const tipo = interaction.options.getString('tipo');
        const menuManager = require('../utils/menuManager');

        try {
          if (tipo === 'embed') {
            const embeds = loadEmbeds();
            const guildEmbeds = embeds[interaction.guildId] || {};
            
            if (Object.keys(guildEmbeds).length === 0) {
              return interaction.reply({
                content: '❌ No hay embeds guardados en este servidor.',
                ephemeral: true
              });
            }

            const embedList = Object.entries(guildEmbeds).map(([name, data]) => {
              return `📝 **ID:** \`${name}\`\n> Título: ${data.title || 'Sin título'}\n> Actualizado: <t:${Math.floor(data.updatedAt / 1000)}:R>`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
              .setTitle('📝 Lista de Embeds')
              .setDescription('**Embeds disponibles:**\n*(Haz clic en la ID para copiarla)*\n\n' + embedList)
              .setColor(0x3498db)
              .setFooter({ text: 'Tip: Haz clic en las IDs entre ` ` para copiarlas fácilmente' })
              .setTimestamp();

            return interaction.reply({
              embeds: [embed],
              ephemeral: true
            });
          }

          if (tipo === 'panel') {
            const menus = await menuManager.getMenusForGuild(interaction.guildId);
            const panels = {};

            // Recolectar todos los paneles usados en los menús
            Object.values(menus).forEach(menu => {
              menu.options.forEach(opt => {
                if (!panels[opt.value]) {
                  panels[opt.value] = {
                    count: 0,
                    menus: new Set()
                  };
                }
                panels[opt.value].count++;
                panels[opt.value].menus.add(menu.id);
              });
            });

            if (Object.keys(panels).length === 0) {
              return interaction.reply({
                content: '❌ No hay paneles configurados en este servidor.',
                ephemeral: true
              });
            }

            const panelList = Object.entries(panels).map(([panelId, data]) => {
              const menusList = Array.from(data.menus).join(', ');
              return `📋 **${panelId}**\n> Usado en ${data.count} opciones\n> Menús: ${menusList}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
              .setTitle('📋 Lista de Paneles')
              .setDescription(panelList)
              .setColor(0x2ecc71)
              .setTimestamp();

            return interaction.reply({
              embeds: [embed],
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('Error al listar:', error);
          return interaction.reply({
            content: '❌ Ocurrió un error al obtener la lista.',
            ephemeral: true
          });
        }
      }

      return interaction.reply({ content: 'Subcomando no reconocido.', ephemeral: true });
    } catch (error) {
      console.error('Error en comando ticket:', error);
      try { return interaction.reply({ content: '❌ Ocurrió un error al procesar el comando.', ephemeral: true }); } catch (e) {}
    }
  }
};