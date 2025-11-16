const fs = require('fs').promises;
const path = require('path');
const { PermissionFlagsBits } = require('discord.js');
const logSystem = require('./logSystem');

class TempMuteManager {
    constructor() {
        this.muteTimers = new Map();
        this.mutePath = path.join(__dirname, '..', 'data', 'moderation', 'tempmutes.json');
        this.loadMutes();
    }

    async loadMutes() {
        try {
            const data = await fs.readFile(this.mutePath, 'utf8');
            const mutes = JSON.parse(data);
            
            // Restaurar timers para mutes existentes
            for (const guildId in mutes) {
                for (const userId in mutes[guildId]) {
                    const muteInfo = mutes[guildId][userId];
                    if (muteInfo.endTime > Date.now()) {
                        this.setMuteTimer(guildId, userId, muteInfo.endTime);
                    } else {
                        // Si el mute ya expiró, lo removemos
                        await this.removeMute(guildId, userId);
                    }
                }
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Si el archivo no existe, lo creamos
                await this.saveMutes({});
            } else {
                console.error('Error cargando mutes:', error);
            }
        }
    }

    async saveMutes(mutes) {
        try {
            await fs.writeFile(this.mutePath, JSON.stringify(mutes, null, 2));
        } catch (error) {
            console.error('Error guardando mutes:', error);
        }
    }

    async getMutes() {
        try {
            const data = await fs.readFile(this.mutePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            console.error('Error leyendo mutes:', error);
            return {};
        }
    }

    setMuteTimer(guildId, userId, endTime) {
        // Cancelar timer existente si hay uno
        if (this.muteTimers.has(`${guildId}-${userId}`)) {
            clearTimeout(this.muteTimers.get(`${guildId}-${userId}`));
        }

        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) return;

        // Crear nuevo timer
        const timer = setTimeout(async () => {
            await this.removeMute(guildId, userId);
        }, timeLeft);

        this.muteTimers.set(`${guildId}-${userId}`, timer);
    }

    async addMute(guild, user, moderator, duration, reason) {
        try {
            const endTime = Date.now() + duration;
            const mutes = await this.getMutes();

            // Inicializar estructura si no existe
            if (!mutes[guild.id]) {
                mutes[guild.id] = {};
            }

            // Guardar información del mute
            mutes[guild.id][user.id] = {
                userId: user.id,
                moderatorId: moderator.id,
                reason: reason,
                startTime: Date.now(),
                endTime: endTime,
                duration: duration
            };

            // Guardar en archivo
            await this.saveMutes(mutes);

            // Configurar timer
            this.setMuteTimer(guild.id, user.id, endTime);

            // Aplicar rol de mute
            const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'mute');
            if (!muteRole) {
                // Crear rol de mute si no existe
                const muteRole = await guild.roles.create({
                    name: 'Mute',
                    color: '#808080',
                    reason: 'Rol de mute para usuarios silenciados',
                    permissions: []
                });

                // Configurar permisos en todos los canales
                await Promise.all(guild.channels.cache.map(channel => {
                    return channel.permissionOverwrites.create(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Connect: false,
                        Speak: false
                    });
                }));
            }

            const member = await guild.members.fetch(user.id);
            await member.roles.add(muteRole);

            // Enviar log
            await logSystem.sendLog(guild, 'MUTE', {
                user: user,
                moderator: moderator,
                reason: reason,
                duration: this.formatDuration(duration),
                caseId: Date.now().toString(36)
            });

            return true;
        } catch (error) {
            console.error('Error añadiendo mute:', error);
            return false;
        }
    }

    async removeMute(guildId, userId, removedBy = null) {
        try {
            const mutes = await this.getMutes();
            if (!mutes[guildId]?.[userId]) return false;

            const muteInfo = mutes[guildId][userId];
            delete mutes[guildId][userId];
            
            // Si no quedan mutes en el servidor, eliminar entrada del servidor
            if (Object.keys(mutes[guildId]).length === 0) {
                delete mutes[guildId];
            }

            await this.saveMutes(mutes);

            // Cancelar timer si existe
            if (this.muteTimers.has(`${guildId}-${userId}`)) {
                clearTimeout(this.muteTimers.get(`${guildId}-${userId}`));
                this.muteTimers.delete(`${guildId}-${userId}`);
            }

            // Remover rol de mute
            const guild = await require('../index').client.guilds.fetch(guildId);
            if (!guild) return false;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) return false;

            const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'mute');
            if (muteRole && member.roles.cache.has(muteRole.id)) {
                await member.roles.remove(muteRole);
            }

            // Enviar log si fue removido manualmente
            if (removedBy) {
                await logSystem.sendLog(guild, 'UNMUTE', {
                    user: member.user,
                    moderator: removedBy,
                    reason: 'Mute temporal finalizado manualmente',
                    caseId: Date.now().toString(36)
                });
            } else {
                // Log de expiración automática
                await logSystem.sendLog(guild, 'UNMUTE', {
                    user: member.user,
                    moderator: guild.client.user,
                    reason: 'Mute temporal expirado',
                    caseId: Date.now().toString(36)
                });
            }

            return true;
        } catch (error) {
            console.error('Error removiendo mute:', error);
            return false;
        }
    }

    async getMuteInfo(guildId, userId) {
        const mutes = await this.getMutes();
        return mutes[guildId]?.[userId];
    }

    async getRemainingTime(guildId, userId) {
        const muteInfo = await this.getMuteInfo(guildId, userId);
        if (!muteInfo) return null;

        const remaining = muteInfo.endTime - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours % 24 > 0) parts.push(`${hours % 24}h`);
        if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
        if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

        return parts.join(' ') || '0s';
    }

    parseDuration(str) {
        const regex = /(\d+)\s*(d|h|m|s)/gi;
        let total = 0;
        let match;

        while ((match = regex.exec(str)) !== null) {
            const num = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            switch (unit) {
                case 'd': total += num * 24 * 60 * 60 * 1000; break;
                case 'h': total += num * 60 * 60 * 1000; break;
                case 'm': total += num * 60 * 1000; break;
                case 's': total += num * 1000; break;
            }
        }

        return total;
    }
}

module.exports = new TempMuteManager();