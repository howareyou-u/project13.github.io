// Guardar configuración de un servidor
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { guildId, config } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || !guildId || !config) {
      return res.status(400).json({ error: 'Token, guildId and config required' });
    }

    // Verificar que el usuario es administrador del servidor
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const guilds = await guildsResponse.json();
    const isAdmin = guilds.some(g => 
      g.id === guildId && (g.permissions & 0x8) === 0x8
    );

    if (!isAdmin) {
      return res.status(403).json({ error: 'Not authorized to modify this guild' });
    }

    // TODO: Guardar configuración en base de datos
    // Aquí guardarías la configuración en tu BD:
    // await saveGuildConfig(guildId, config);

    // Por ahora solo confirmamos
    res.status(200).json({ 
      success: true, 
      message: 'Configuration saved successfully',
      config: config
    });

  } catch (err) {
    console.error('Save config error:', err);
    res.status(500).json({ error: err.message });
  }
};
