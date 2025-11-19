// Obtener servidores (guilds) del usuario
module.exports = async (req, res) => {
  try {
    const token = req.query.token || req.body?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Obtener guilds del usuario
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!guildsResponse.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const guilds = await guildsResponse.json();

    // Filtrar solo servidores donde el usuario es admin
    const adminGuilds = guilds.filter(guild => {
      // Check if user has admin permissions
      return (guild.permissions & 0x8) === 0x8; // ADMINISTRATOR permission
    });

    // Intentar determinar si el bot está presente en cada guild (requiere BOT_TOKEN en env)
    const botToken = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;

    if (botToken) {
      // Comprobar presencia del bot para cada guild (paralelizar)
      const checks = adminGuilds.map(async g => {
        try {
          const r = await fetch(`https://discord.com/api/v10/guilds/${g.id}`, {
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json'
            }
          });

          // Si el bot puede obtener información del guild, asumimos que está presente
          return Object.assign({}, g, { botInGuild: r.ok });
        } catch (e) {
          return Object.assign({}, g, { botInGuild: false });
        }
      });

      const guildsWithBot = await Promise.all(checks);

      res.status(200).json({ 
        success: true, 
        guilds: guildsWithBot 
      });
    } else {
      // Si no hay BOT_TOKEN, devolvemos la lista sin información sobre el bot
      const guildsNoBotInfo = adminGuilds.map(g => Object.assign({}, g, { botInGuild: null }));
      res.status(200).json({ 
        success: true, 
        guilds: guildsNoBotInfo 
      });
    }

  } catch (err) {
    console.error('Guilds error:', err);
    res.status(500).json({ error: err.message });
  }
};
