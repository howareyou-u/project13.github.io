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

    res.status(200).json({ 
      success: true, 
      guilds: adminGuilds 
    });

  } catch (err) {
    console.error('Guilds error:', err);
    res.status(500).json({ error: err.message });
  }
};
