const { 
  Client, 
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// === CONFIGURA TUS DATOS AQUÍ (usa variables de entorno en producción) ===
// Define estas variables en bot/.env o en tu entorno de despliegue:
// DISCORD_TOKEN, CLIENT_ID, GUILD_ID, ADMIN_TOKEN (opcional)
require('dotenv').config();
const TOKEN = process.env.DISCORD_TOKEN || '';
const CLIENT_ID = process.env.CLIENT_ID || '1200476680280608958';
const GUILD_ID = process.env.GUILD_ID || '1235989145399070871';

// Instancia única del cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// Colecciones
client.commands = new Collection();
client.slashCommands = new Collection();

// Asegurarse que existan las carpetas necesarias
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}

// Cargar comandos y eventos
async function loadCommands() {
  const comandosPath = path.join(__dirname, 'comandos');

  // Crear carpeta si no existe
  if (!fs.existsSync(comandosPath)) {
    console.error('❌ La carpeta "comandos" no existe. Creándola...');
    fs.mkdirSync(comandosPath);
  }

  // Cargar comandos
  const archivosComandos = fs.readdirSync(comandosPath).filter(file => file.endsWith('.js'));
  console.log(`📂 Cargando ${archivosComandos.length} comandos...`);

  const slashCommands = [];

  for (const file of archivosComandos) {
    try {
      const comando = require(path.join(comandosPath, file));
      if (comando.name) {
        client.commands.set(comando.name, comando);
        
        // Solo registrar el comando de tickets como slash command
        if (comando.slashCommand && comando.name === 'ticket') {
          client.slashCommands.set(comando.name, comando);
          slashCommands.push(comando.slashCommand);
        }
        
        console.log(`✅ Comando "${comando.name}" cargado (${file})`);
      } else {
        console.warn(`⚠️ El comando en ${file} no tiene nombre definido`);
      }
    } catch (error) {
      console.error(`❌ Error al cargar el comando ${file}:`, error.message);
    }
  }

  console.log(`🎮 ${client.commands.size} comandos cargados (${slashCommands.length} slash)`);

  // Registrar comandos slash
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('⚡ Registrando comandos slash...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: slashCommands }
    );
    console.log('✅ Comandos slash registrados con éxito');
  } catch (error) {
    console.error('❌ Error al registrar comandos slash:', error);
  }
}

// --- Admin internal HTTP endpoint for reloading (used by admin panel)
const express = require('express');
const internalApp = express();
internalApp.use(express.json());
const INTERNAL_PORT = process.env.INTERNAL_PORT || 3001;

function checkAdminToken(req) {
  const header = req.headers['x-admin-token'] || req.query.token;
  const adminToken = process.env.ADMIN_TOKEN || TOKEN;
  return header && header === adminToken;
}

internalApp.post('/internal/reload', async (req, res) => {
  try {
    if (!checkAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });

    console.log('Internal reload requested via admin panel. Reloading commands...');
    // Reload commands (re-register slash commands and refresh command collection)
    try {
      await loadCommands();
    } catch (e) {
      console.error('Error reloading commands:', e);
      return res.status(500).json({ ok: false, error: 'Failed to reload commands' });
    }

    return res.json({ ok: true, note: 'Commands reloaded. Note: events are not reloaded to avoid duplicate listeners.' });
  } catch (error) {
    console.error('Error in /internal/reload:', error);
    return res.status(500).json({ ok: false });
  }
});

internalApp.listen(INTERNAL_PORT, () => {
  console.log(`Internal admin endpoint listening on http://localhost:${INTERNAL_PORT}`);
});

// Endpoint to list guild channels (text channels) for use in the admin panel
internalApp.get('/internal/channels', async (req, res) => {
  try {
    if (!checkAdminToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const guildId = req.query.guildId;
    if (!guildId) return res.status(400).json({ error: 'guildId required' });

    // Try to fetch guild from cache, otherwise fetch
    let guild = client.guilds.cache.get(guildId);
    if (!guild) {
      try {
        guild = await client.guilds.fetch(guildId);
      } catch (e) {
        return res.status(404).json({ error: 'Guild not found' });
      }
    }

    // Fetch channels and filter to text channels
    let channels = [];
    try {
      const chs = await guild.channels.fetch();
      chs.forEach(ch => {
        // include text channels and threads that are showable
        if (ch.type === 0 /* GuildText */ || ch.type === 15 /* Forum */ || ch.type === 11 /* AnnouncementThread */ || ch.type === 12 /* PublicThread */ || ch.type === 10 /* PrivateThread */) {
          channels.push({ id: ch.id, name: ch.name || ch.id, type: ch.type });
        }
      });
    } catch (err) {
      // fallback to cache
      guild.channels.cache.forEach(ch => {
        if (ch.type === 0) channels.push({ id: ch.id, name: ch.name || ch.id, type: ch.type });
      });
    }

    return res.json({ ok: true, channels });
  } catch (error) {
    console.error('Error in /internal/channels:', error);
    return res.status(500).json({ ok: false });
  }
});

// Cargar eventos
async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  
  // Crear carpeta si no existe
  if (!fs.existsSync(eventsPath)) {
    console.log('📂 Creando carpeta "events"...');
    fs.mkdirSync(eventsPath);
  }

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  console.log(`📂 Cargando ${eventFiles.length} eventos...`);

  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      console.log(`✅ Evento "${event.name}" cargado (${file})`);
    } catch (error) {
      console.error(`❌ Error al cargar el evento ${file}:`, error);
    }
  }
}

// Evento: Mensajes (Comandos con !)
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const prefix = '!';
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  try {
    const command = client.commands.get(commandName);
    if (!command) return;
    
    // Check if command is enabled
    if (command.enabled === false) {
      await message.reply('❌ Este comando está temporalmente desactivado.');
      return;
    }

    // Soporte flexible para diferentes estilos de comandos
    if (typeof command.execute === 'function') {
      await command.execute(message, args);
    } else if (typeof command.messageExecute === 'function') {
      await command.messageExecute(message, args);
    } else if (typeof command.run === 'function') {
      await command.run(message, args);
    } else if (typeof command.sendHelpMessage === 'function') {
      // Algunos comandos (ej. help-bot) usan sendHelpMessage
      await command.sendHelpMessage(message, args);
    } else {
      console.warn(`⚠️ Comando '${commandName}' cargado pero no implementa un handler de mensajes válido.`);
      await message.reply('❌ Este comando no está disponible vía mensajes (usa slash).');
    }
  } catch (error) {
    console.error(`❌ Error en comando !${commandName}:`, error);
    try { await message.reply('❌ Hubo un error al ejecutar el comando.'); } catch (e) { /* ignore */ }
  }
});

// Evento: Bot listo
client.once('ready', async () => {
  console.log('='.repeat(40));
  console.log(`🚀 Bot conectado como ${client.user.tag}`);
  console.log(`📊 Presente en ${client.guilds.cache.size} servidores`);
  console.log(`💬 ${client.commands.size} comandos cargados (${client.slashCommands.size} slash)`);
  console.log('='.repeat(40));

  // Estado del bot
  client.user.setPresence({
    activities: [{ 
      name: '!help para ayuda', 
      type: ActivityType.Playing
    }],
    status: 'online'
  });
});

// Evento: Interacción con comandos slash y componentes
client.on('interactionCreate', async interaction => {
  try {
    // Comandos slash
    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;
      
      // Check if command is enabled
      if (command.enabled === false) {
        await interaction.reply({ content: '❌ Este comando está temporalmente desactivado.', ephemeral: true });
        return;
      }

      try {
        await command.slashExecute(interaction);
      } catch (error) {
        console.error(`❌ Error en comando /${interaction.commandName}:`, error);
        const errorMessage = { 
          content: '❌ Hubo un error al ejecutar el comando.', 
          ephemeral: true 
        };
        
        if (interaction.deferred) {
          await interaction.editReply(errorMessage);
        } else if (!interaction.replied) {
          await interaction.reply(errorMessage);
        }
      }
      return;
    }

    // Select menus
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;
      const command = client.commands.find(cmd => 
        cmd.handleSelect && customId.includes(cmd.name)
      );

      if (command) {
        try {
          await command.handleSelect(interaction, interaction.guild.id);
        } catch (error) {
          console.error(`❌ Error en select menu (${customId}):`, error);
          await interaction.reply({ 
            content: '❌ Error al procesar la selección.', 
            ephemeral: true 
          });
        }
      }
      return;
    }

    // Botones
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const command = client.commands.find(cmd => 
        cmd.handleButton && customId.includes(cmd.name)
      );

      if (command) {
        try {
          await command.handleButton(interaction, interaction.guild.id);
        } catch (error) {
          console.error(`❌ Error en botón (${customId}):`, error);
          await interaction.reply({ 
            content: '❌ Error al procesar el botón.', 
            ephemeral: true 
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error manejando interacción:', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: '❌ Error al procesar la interacción.', 
          ephemeral: true 
        });
      } else if (!interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error al procesar la interacción.', 
          ephemeral: true 
        });
      }
    } catch (e) {
      console.error('Error enviando mensaje de error:', e);
    }
  }
});

// Evento: Errores
client.on('error', error => {
  console.error('❌ Error del cliente:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Error no manejado:', error);
});

// Iniciar el bot
async function init() {
  console.log('🔄 Iniciando bot...');
  
  // Primero cargar comandos y eventos
  await loadCommands();
  await loadEvents();
  
  // Luego iniciar sesión
  try {
    await client.login(TOKEN);
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    process.exit(1);
  }
}

// Ejecutar inicialización
init();