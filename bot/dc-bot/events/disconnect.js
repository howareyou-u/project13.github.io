module.exports = {
  name: 'disconnect',
  once: false,
  async execute(client) {
    // Enviar mensaje de desconexión a todos los servidores
    const embed = {
      color: 0xFF0000,
      title: '🔴 Bot Offline',
      description: 'El bot se ha desconectado.',
      footer: { text: `${client.user.tag} | ${new Date().toLocaleString()}` }
    };

    client.guilds.cache.forEach(async (guild) => {
      try {
        const channel = guild.channels.cache.find(
          channel => channel.type === 0 && 
            channel.permissionsFor(guild.members.me).has('SendMessages')
        );
        
        if (channel) {
          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        console.error(`No pude enviar mensaje de desconexión en ${guild.name}:`, error);
      }
    });

    console.log('🔴 Bot desconectado');
  }
};