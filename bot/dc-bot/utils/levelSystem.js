const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class LevelSystem {
    constructor() {
        this.cooldowns = new Map();
        this.levelUpMessages = true;
    }

    // Calcular XP necesaria para siguiente nivel
    getXPForLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    // Calcular nivel basado en XP total
    getLevelFromXP(xp) {
        let level = 1;
        while (xp >= this.getXPForLevel(level)) {
            xp -= this.getXPForLevel(level);
            level++;
        }
        return level;
    }

    // Obtener XP restante para siguiente nivel
    getRemainingXP(xp) {
        const level = this.getLevelFromXP(xp);
        const xpForLevel = this.getXPForLevel(level);
        let remainingXP = xpForLevel;
        let tempXP = xp;
        
        for (let i = 1; i < level; i++) {
            tempXP -= this.getXPForLevel(i);
        }
        
        return {
            current: tempXP,
            required: xpForLevel,
            remaining: xpForLevel - tempXP
        };
    }

    // Generar barra de progreso
    getProgressBar(current, max, barLength = 15) {
        const progress = Math.round((current / max) * barLength);
        const emptyProgress = barLength - progress;
        const progressText = '█'.repeat(progress);
        const emptyProgressText = '░'.repeat(emptyProgress);
        return progressText + emptyProgressText;
    }

    // Cargar datos de usuario
    async loadUserData(guildId, userId) {
        const filePath = path.join(__dirname, '..', 'data', 'economy', `${guildId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const users = JSON.parse(data);
            return users[userId] || { xp: 0, coins: 0, inventory: [], lastDaily: null };
        } catch (error) {
            return { xp: 0, coins: 0, inventory: [], lastDaily: null };
        }
    }

    // Guardar datos de usuario
    async saveUserData(guildId, userId, userData) {
        const filePath = path.join(__dirname, '..', 'data', 'economy', `${guildId}.json`);
        try {
            let users = {};
            try {
                const data = await fs.readFile(filePath, 'utf8');
                users = JSON.parse(data);
            } catch (error) {
                // Si el archivo no existe, comenzamos con un objeto vacío
            }

            users[userId] = userData;
            await fs.writeFile(filePath, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('Error guardando datos de usuario:', error);
            return false;
        }
    }

    // Añadir XP a un usuario
    async addXP(message, xpToAdd) {
        const userId = message.author.id;
        const guildId = message.guild.id;

        // Verificar cooldown (1 minuto entre mensajes)
        const cooldownKey = `${guildId}-${userId}`;
        if (this.cooldowns.has(cooldownKey)) {
            const timeLeft = this.cooldowns.get(cooldownKey) - Date.now();
            if (timeLeft > 0) return;
        }
        this.cooldowns.set(cooldownKey, Date.now() + 60000);

        // Cargar datos actuales
        const userData = await this.loadUserData(guildId, userId);
        const oldLevel = this.getLevelFromXP(userData.xp);
        
        // Añadir XP
        userData.xp += xpToAdd;
        const newLevel = this.getLevelFromXP(userData.xp);

        // Guardar datos
        await this.saveUserData(guildId, userId, userData);

        // Verificar subida de nivel
        if (newLevel > oldLevel && this.levelUpMessages) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 ¡Subida de Nivel!')
                .setDescription(`¡Felicidades ${message.author}! Has alcanzado el nivel **${newLevel}**`)
                .addFields(
                    { name: '📊 Progreso', value: this.getLevelProgress(userData.xp) }
                )
                .setFooter({ text: `Sigue así, ¡cada mensaje cuenta!` });

            message.channel.send({ embeds: [embed] });
        }

        return { oldLevel, newLevel };
    }

    // Obtener progreso de nivel formateado
    getLevelProgress(xp) {
        const level = this.getLevelFromXP(xp);
        const { current, required } = this.getRemainingXP(xp);
        const progressBar = this.getProgressBar(current, required);
        const percentage = Math.round((current / required) * 100);
        
        return `Nivel ${level} | XP: ${current}/${required} (${percentage}%)\n${progressBar}`;
    }
}

module.exports = new LevelSystem();