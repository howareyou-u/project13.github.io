const levelSystem = require('../utils/levelSystem');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Ignorar mensajes de bots y DMs
        if (message.author.bot || !message.guild) return;

        // Generar XP aleatorio entre 15 y 25
        const xpToAdd = Math.floor(Math.random() * 11) + 15;
        
        // Añadir XP al usuario
        await levelSystem.addXP(message, xpToAdd);
    }
};