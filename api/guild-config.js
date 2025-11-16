// Obtener configuración de un servidor específico
module.exports = async (req, res) => {
  try {
    const { guildId } = req.query;
    const token = req.query.token || req.body?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token || !guildId) {
      return res.status(400).json({ error: 'Token and guildId required' });
    }

    let guild = null;
    let botInGuild = false;
    const botToken = process.env.BOT_TOKEN;

    // Primero intentar obtener información del servidor con el token del bot
    if (botToken) {
      try {
        const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (guildResponse.ok) {
          guild = await guildResponse.json();
          botInGuild = true;
        }
      } catch (e) {
        console.log('Bot token failed, trying user token:', e.message);
      }
    }

    // Si el bot no está en el servidor, usar el token del usuario para obtener info básica
    if (!guild) {
      try {
        const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (guildResponse.ok) {
          guild = await guildResponse.json();
        } else if (guildResponse.status === 404) {
          return res.status(404).json({ 
            success: false,
            error: 'Guild not found or bot not in server',
            botInGuild: false
          });
        } else {
          return res.status(guildResponse.status).json({ 
            success: false,
            error: 'Unable to access guild',
            botInGuild: false
          });
        }
      } catch (e) {
        return res.status(500).json({ 
          success: false,
          error: 'Error fetching guild information',
          botInGuild: false
        });
      }
    }

    if (!guild) {
      return res.status(404).json({ 
        success: false,
        error: 'Guild not found',
        botInGuild: false
      });
    }

    // Obtener canales del servidor (solo si el bot está en el servidor)
    let textChannels = [];
    if (botInGuild && botToken) {
      try {
        const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (channelsResponse.ok) {
          const channels = await channelsResponse.json();
          textChannels = channels.filter(ch => ch.type === 0); // Type 0 = Text channel
        }
      } catch (e) {
        console.error('Error fetching channels:', e.message);
      }
    } else if (!botToken) {
      // Si no hay BOT_TOKEN configurado (bot local), intentar obtener canales con token de usuario
      // Esto permite que funcione aunque el bot esté ejecutándose localmente
      try {
        const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (channelsResponse.ok) {
          const channels = await channelsResponse.json();
          textChannels = channels.filter(ch => ch.type === 0); // Type 0 = Text channel
          // Asumir que el bot está en el servidor si podemos obtener canales
          botInGuild = true;
        }
      } catch (e) {
        console.error('Error fetching channels with user token:', e.message);
      }
    }
    
    // Si aún no tenemos canales y no detectamos el bot, mostrar error
    if (!botInGuild && botToken) {
      return res.status(200).json({ 
        success: false,
        error: 'Bot not in server',
        botInGuild: false,
        guild: {
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          ownerId: guild.owner_id
        },
        message: 'El bot debe estar en el servidor para poder configurarlo'
      });
    }

    // Intentar obtener configuración guardada en la base de datos (MongoDB)
    const mongo = require('./mongo');
    let dbConfig = null;
    try {
      const col = await mongo.getCollection();
      if (col) {
        const doc = await col.findOne({ guildId: guildId });
        dbConfig = doc?.config || null;
      }
    } catch (e) {
      console.error('Error reading config from MongoDB:', e.message || e);
      dbConfig = null;
    }

    // Por ahora retornamos configuración por defecto si no hay config en BD
    const config = dbConfig || {
      welcome: {
        enabled: true,
        channel: textChannels[0]?.id || null,
        message: 'Bienvenido {user} al servidor!'
      },
      farewell: {
        enabled: false,
        channel: textChannels[0]?.id || null,
        message: '{user} nos ha abandonado :('
      },
      inviteTracker: {
        enabled: true
      },
      automod: {
        enabled: true,
        wordFilter: false,
        antiSpam: true,
        antiRaid: true
      },
      music: {
        enabled: true
      },
      prefix: '!'
    };

    res.status(200).json({ 
      success: true,
      botInGuild: true,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.owner_id
      },
      channels: textChannels.map(ch => ({ id: ch.id, name: ch.name })),
      config: config
    });

  } catch (err) {
    console.error('Guild config error:', err);
    res.status(500).json({ error: err.message });
  }
};
