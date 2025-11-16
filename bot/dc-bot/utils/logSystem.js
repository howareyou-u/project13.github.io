const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Mapeo de eventos a categorías de logs
const EVENT_TYPE_MAP = {
    // Moderación
    GUILD_MEMBER_BAN: 'moderation',
    GUILD_MEMBER_KICK: 'moderation',
    GUILD_MEMBER_WARN: 'moderation',
    GUILD_MEMBER_UNBAN: 'moderation',
    GUILD_MEMBER_MUTE: 'moderation',
    GUILD_MEMBER_UNMUTE: 'moderation',
    
    // Mensajes
    MESSAGE_DELETE: 'messages',
    MESSAGE_EDIT: 'messages',
    
    // Canales
    CHANNEL_CREATE: 'server',
    CHANNEL_DELETE: 'server',
    CHANNEL_UPDATE: 'server',
    
    // Roles
    ROLE_CREATE: 'server',
    ROLE_DELETE: 'server',
    ROLE_UPDATE: 'server',
    
    // Miembros
    MEMBER_JOIN: 'members',
    MEMBER_LEAVE: 'members',
    MEMBER_UPDATE: 'members',
    
    // Voice 
    VOICE_JOIN: 'voice',
    VOICE_LEAVE: 'voice',
    VOICE_MOVE: 'voice',
    VOICE_MUTE: 'voice',
    VOICE_DEAFEN: 'voice'
};

class LogSystem {
    constructor() {
        this.logTypes = {
            // Moderación
            BAN: {
                color: '#FF0000',
                emoji: '🔨',
                title: 'Usuario Baneado',
                category: 'moderation'
            },
            UNBAN: {
                color: '#00FF00',
                emoji: '🔓',
                title: 'Usuario Desbaneado',
                category: 'moderation'
            },
            KICK: {
                color: '#FFA500',
                emoji: '👢',
                title: 'Usuario Expulsado',
                category: 'moderation'
            },
            MUTE: {
                color: '#FFD700',
                emoji: '🔇',
                title: 'Usuario Silenciado',
                category: 'moderation'
            },
            UNMUTE: {
                color: '#32CD32',
                emoji: '🔊',
                title: 'Usuario Desilenciado',
                category: 'moderation'
            },
            WARN: {
                color: '#FF7F50',
                emoji: '⚠️',
                title: 'Usuario Advertido',
                category: 'moderation'
            },
            
            // Mensajes
            MESSAGE_DELETE: {
                color: '#FF6B6B',
                emoji: '🗑️',
                title: 'Mensaje Eliminado',
                category: 'messages'
            },
            MESSAGE_EDIT: {
                color: '#4ECDC4',
                emoji: '✏️',
                title: 'Mensaje Editado',
                category: 'messages'
            },

            // Servidor
            CHANNEL_CREATE: {
                color: '#45B7D1',
                emoji: '📝',
                title: 'Canal Creado',
                category: 'server'
            },
            CHANNEL_DELETE: {
                color: '#FF6B6B',
                emoji: '🗑️',
                title: 'Canal Eliminado',
                category: 'server'
            },
            CHANNEL_UPDATE: {
                color: '#4ECDC4',
                emoji: '🔄',
                title: 'Canal Actualizado',
                category: 'server'
            },
            ROLE_CREATE: {
                color: '#45B7D1',
                emoji: '➕',
                title: 'Rol Creado',
                category: 'server'
            },
            ROLE_DELETE: {
                color: '#FF6B6B',
                emoji: '➖',
                title: 'Rol Eliminado',
                category: 'server'
            },
            ROLE_UPDATE: {
                color: '#4ECDC4',
                emoji: '🔄',
                title: 'Rol Actualizado',
                category: 'server'
            },

            // Miembros
            MEMBER_JOIN: {
                color: '#77DD77',
                emoji: '📥',
                title: 'Miembro Unido',
                category: 'members'
            },
            MEMBER_LEAVE: {
                color: '#FF6961',
                emoji: '📤',
                title: 'Miembro Salió',
                category: 'members'
            },
            MEMBER_UPDATE: {
                color: '#4ECDC4',
                emoji: '🔄',
                title: 'Miembro Actualizado',
                category: 'members'
            },

            // Voice
            VOICE_JOIN: {
                color: '#77DD77',
                emoji: '🎙️',
                title: 'Unión a Canal de Voz',
                category: 'voice'
            },
            VOICE_LEAVE: {
                color: '#FF6961',
                emoji: '🎙️',
                title: 'Salida de Canal de Voz',
                category: 'voice'
            },
            VOICE_MOVE: {
                color: '#4ECDC4',
                emoji: '↔️',
                title: 'Movimiento entre Canales de Voz',
                category: 'voice'
            },
            VOICE_MUTE: {
                color: '#FFB347',
                emoji: '🔇',
                title: 'Silenciado en Canal de Voz',
                category: 'voice'
            },
            VOICE_DEAFEN: {
                color: '#FFB347',
                emoji: '🔈',
                title: 'Ensordecido en Canal de Voz',
                category: 'voice'
            }
        };
    }

    async getLogChannel(guildId, eventType) {
    try {
        const configPath = path.join(__dirname, '..', 'data', 'config.json');
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        
        // Obtener la categoría de log basada en el tipo de evento
        const logInfo = this.logTypes[eventType];
        const category = logInfo?.category || EVENT_TYPE_MAP[eventType];
        
        return config[guildId]?.logChannels?.[category];
    } catch (error) {
        console.error('Error al obtener canal de logs:', error);
        return null;
    }
}

    createLogEmbed(type, data) {
        const logInfo = this.logTypes[type];
        if (!logInfo) {
            console.error(`Tipo de log no reconocido: ${type}`);
            return null;
        }

        const embed = new EmbedBuilder()
            .setColor(logInfo.color)
            .setTitle(`${logInfo.emoji} ${logInfo.title}`)
            .setTimestamp();

        // Campos comunes
        if (data.user) {
            embed.addFields({ 
                name: '👤 Usuario',
                value: `${data.user.tag} (${data.user.id})`,
                inline: true 
            });
            embed.setThumbnail(data.user.displayAvatarURL({ dynamic: true }));
        }

        if (data.moderator) {
            embed.addFields({ 
                name: '👮 Moderador', 
                value: `${data.moderator.tag}`,
                inline: true 
            });
        }

        if (data.reason) {
            embed.addFields({ 
                name: '📝 Razón', 
                value: data.reason || 'No especificada'
            });
        }

        // Campos específicos según el tipo
        switch (type) {
            case 'MUTE':
                if (data.duration) {
                    embed.addFields({ 
                        name: '⏱️ Duración', 
                        value: data.duration,
                        inline: true 
                    });
                }
                break;
            case 'WARN':
                if (data.severity) {
                    const severityEmojis = {
                        low: '🟡',
                        medium: '🟠',
                        high: '🔴'
                    };
                    embed.addFields({ 
                        name: '📊 Severidad', 
                        value: `${severityEmojis[data.severity]} ${data.severity.toUpperCase()}`,
                        inline: true 
                    });
                }
                break;
            case 'MESSAGE_DELETE':
            case 'MESSAGE_EDIT':
                if (data.content) {
                    embed.addFields({ 
                        name: '📝 Contenido', 
                        value: data.content.length > 1024 ? 
                            data.content.substring(0, 1021) + '...' : 
                            data.content 
                    });
                }
                if (data.channel) {
                    embed.addFields({ 
                        name: '📢 Canal', 
                        value: `<#${data.channel.id}>`,
                        inline: true 
                    });
                }
                if (type === 'MESSAGE_EDIT' && data.newContent) {
                    embed.addFields({ 
                        name: '✏️ Nuevo Contenido', 
                        value: data.newContent.length > 1024 ? 
                            data.newContent.substring(0, 1021) + '...' : 
                            data.newContent 
                    });
                }
                break;
            case 'CHANNEL_CREATE':
            case 'CHANNEL_DELETE':
            case 'CHANNEL_UPDATE':
                if (data.channel) {
                    embed.addFields({ 
                        name: '📢 Canal', 
                        value: `${data.channel.name} (${data.channel.type})`,
                        inline: true 
                    });
                }
                if (data.changes) {
                    embed.addFields({ 
                        name: '🔄 Cambios', 
                        value: data.changes 
                    });
                }
                break;
            case 'ROLE_CREATE':
            case 'ROLE_DELETE':
            case 'ROLE_UPDATE':
                if (data.role) {
                    embed.addFields({ 
                        name: '🎭 Rol', 
                        value: data.role.name,
                        inline: true 
                    });
                }
                if (data.changes) {
                    embed.addFields({ 
                        name: '🔄 Cambios', 
                        value: data.changes 
                    });
                }
                break;
            case 'VOICE_JOIN':
            case 'VOICE_LEAVE':
            case 'VOICE_MOVE':
                if (data.channel) {
                    embed.addFields({ 
                        name: '🔊 Canal', 
                        value: data.channel.name,
                        inline: true 
                    });
                }
                if (data.oldChannel && type === 'VOICE_MOVE') {
                    embed.addFields({ 
                        name: '📤 Canal Anterior', 
                        value: data.oldChannel.name,
                        inline: true 
                    });
                }
                break;
        }

        // Añadir footer con ID de caso si existe
        if (data.caseId) {
            embed.setFooter({ 
                text: `Caso #${data.caseId}` 
            });
        }

        return embed;
    }

    async sendLog(guild, type, data) {
        try {
            const logChannelId = await this.getLogChannel(guild.id, type);
            if (!logChannelId) return;

            const logChannel = await guild.channels.fetch(logChannelId);
            if (!logChannel) return;

            const embed = this.createLogEmbed(type, data);
            if (!embed) return;

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error al enviar log:', error);
        }
    }
}

module.exports = new LogSystem();