// Obtener configuración de un servidor específico
module.exports = async (req, res) => {
  try {
    const { guildId } = req.query;
    const token = req.query.token || req.body?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token || !guildId) {
      return res.status(400).json({ error: 'Token and guildId required' });
    }

    // Obtener información del servidor desde la API de Discord
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!guildResponse.ok) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const guild = await guildResponse.json();

    // Obtener canales del servidor
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const channels = await channelsResponse.json();
    const textChannels = channels.filter(ch => ch.type === 0); // Type 0 = Text channel

    // TODO: Obtener configuración guardada en base de datos
    // Por ahora retornamos configuración por defecto
    const config = {
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
