// EJEMPLO: Archivo para tu bot local (NOT en Vercel)
// Este archivo muestra cómo conectar tu bot de Discord con la configuración del dashboard

// Instala primero: npm install discord.js dotenv

const { Client, GatewayIntentBits, Events, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ]
});

// ==================== CONFIG MANAGER ====================
class GuildConfigManager {
  static configDir = path.join(__dirname, 'guildConfigs');

  static initialize() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      console.log('✓ Directorio de configuración creado');
    }
  }

  static getConfig(guildId) {
    const filePath = path.join(this.configDir, `${guildId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return this.getDefaultConfig();
    }
    
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error('Error reading config:', err);
      return this.getDefaultConfig();
    }
  }

  static saveConfig(guildId, config) {
    const filePath = path.join(this.configDir, `${guildId}.json`);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log(`✓ Config guardada para: ${guildId}`);
      return true;
    } catch (err) {
      console.error('Error saving config:', err);
      return false;
    }
  }

  static getDefaultConfig() {
    return {
      welcome: {
        enabled: false,
        channel: null,
        message: 'Bienvenido {user} al servidor!'
      },
      farewell: {
        enabled: false,
        channel: null,
        message: '{user} nos ha abandonado :('
      },
      prefix: '!',
      automod: {
        enabled: true,
        antiSpam: true,
        antiRaid: true,
        wordFilter: false
      },
      inviteTracker: {
        enabled: true
      },
      music: {
        enabled: true
      }
    };
  }
}

// ==================== EVENTOS ====================

// Bot listo
client.on(Events.ClientReady, (c) => {
  console.log(`\n✓ Bot conectado como ${c.user.tag}`);
  console.log(`✓ En ${c.guilds.cache.size} servidores\n`);
  c.user.setActivity('tu dashboard', { type: 'WATCHING' });
});

// Nuevo miembro - Mensaje de bienvenida
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const config = GuildConfigManager.getConfig(member.guild.id);
    
    if (!config.welcome.enabled || !config.welcome.channel) {
      return;
    }

    const channel = member.guild.channels.cache.get(config.welcome.channel);
    
    if (!channel) {
      console.log(`⚠ Canal de bienvenida no encontrado: ${config.welcome.channel}`);
      return;
    }

    // Variables disponibles para el mensaje
    const message = config.welcome.message
      .replace('{user}', member.user.username)
      .replace('{mention}', member.toString())
      .replace('{guild}', member.guild.name)
      .replace('{count}', member.guild.memberCount);

    await channel.send(message);
    console.log(`✓ Bienvenida enviada a ${member.user.tag}`);
    
  } catch (error) {
    console.error('Error en evento guildMemberAdd:', error);
  }
});

// Miembro se va - Mensaje de despedida
client.on(Events.GuildMemberRemove, async (member) => {
  try {
    const config = GuildConfigManager.getConfig(member.guild.id);
    
    if (!config.farewell.enabled || !config.farewell.channel) {
      return;
    }

    const channel = member.guild.channels.cache.get(config.farewell.channel);
    
    if (!channel) {
      console.log(`⚠ Canal de despedida no encontrado: ${config.farewell.channel}`);
      return;
    }

    const message = config.farewell.message
      .replace('{user}', member.user.username)
      .replace('{guild}', member.guild.name);

    await channel.send(message);
    console.log(`✓ Despedida enviada por ${member.user.tag}`);
    
  } catch (error) {
    console.error('Error en evento guildMemberRemove:', error);
  }
});

// Mensaje recibido
client.on(Events.MessageCreate, async (message) => {
  try {
    // Ignorar mensajes de bots
    if (message.author.bot) return;

    // Ignorar DMs
    if (!message.guild) return;

    const config = GuildConfigManager.getConfig(message.guildId);
    const prefix = config.prefix || '!';

    // Si no empieza con el prefijo, ignorar
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // ==================== COMANDOS ====================

    // !ping
    if (command === 'ping') {
      const ping = Math.round(client.ws.ping);
      await message.reply(`🏓 Pong! ${ping}ms`);
    }

    // !config - Ver configuración actual
    if (command === 'config') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Solo administradores pueden usar este comando');
      }

      const cfg = GuildConfigManager.getConfig(message.guildId);
      
      const embed = {
        color: 0x5865f2,
        title: '⚙️ Configuración del Servidor',
        fields: [
          { name: 'Prefijo', value: cfg.prefix, inline: true },
          { name: 'Bienvenidas', value: cfg.welcome.enabled ? '✓ Habilitado' : '✗ Deshabilitado', inline: true },
          { name: 'Despedidas', value: cfg.farewell.enabled ? '✓ Habilitado' : '✗ Deshabilitado', inline: true },
          { name: 'AutoMod', value: cfg.automod.enabled ? '✓ Habilitado' : '✗ Deshabilitado', inline: true },
          { name: '', value: '[Editar desde el dashboard →](https://project13-api.vercel.app/dashboard.html)' }
        ]
      };

      await message.reply({ embeds: [embed] });
    }

    // !setprefix - Cambiar prefijo
    if (command === 'setprefix') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Solo administradores pueden usar este comando');
      }

      const newPrefix = args[0];
      if (!newPrefix) {
        return message.reply('❌ Uso: !setprefix [nuevo_prefijo]');
      }

      const cfg = GuildConfigManager.getConfig(message.guildId);
      cfg.prefix = newPrefix;
      GuildConfigManager.saveConfig(message.guildId, cfg);

      await message.reply(`✓ Prefijo cambiado a: \`${newPrefix}\``);
    }

    // !info - Información del bot
    if (command === 'info') {
      const embed = {
        color: 0x5865f2,
        title: '🤖 Información del Bot',
        description: 'Bot de Discord conectado con panel web',
        fields: [
          { name: 'Versión', value: '1.0.0' },
          { name: 'Servidores', value: `${client.guilds.cache.size}` },
          { name: 'Dashboard', value: '[Abre tu panel →](https://project13-api.vercel.app)' }
        ],
        thumbnail: { url: client.user.displayAvatarURL() }
      };

      await message.reply({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error en evento messageCreate:', error);
  }
});

// Error handling
client.on('error', error => {
  console.error('Error del cliente:', error);
});

process.on('unhandledRejection', error => {
  console.error('Promesa rechazada:', error);
});

// ==================== INICIAR ====================

// Inicializar config manager
GuildConfigManager.initialize();

// Conectar bot
client.login(process.env.DISCORD_TOKEN);

console.log('🚀 Iniciando bot...\n');
