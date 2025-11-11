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

    // Guardar configuración en MongoDB si está disponible
    try {
      const mongo = require('./mongo');
      const col = await mongo.getCollection();
      if (col) {
        await col.updateOne(
          { guildId },
          { $set: { guildId, config, updatedAt: new Date() } },
          { upsert: true }
        );
        return res.status(200).json({ success: true, message: 'Configuration saved to DB', config });
      }
    } catch (e) {
      console.error('Error saving config to MongoDB:', e.message || e);
    }

    // Si no hay DB configurada, devolver confirmación temporal
    res.status(200).json({ 
      success: true, 
      message: 'Configuration received (DB not configured)',
      config: config
    });

  } catch (err) {
    console.error('Save config error:', err);
    res.status(500).json({ error: err.message });
  }
};
