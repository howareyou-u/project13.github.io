const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

module.exports = {
  name: 'warn',
  enabled: true,
  description: 'Sistema de advertencias para usuarios',    // Comando Slash
    slashCommand: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Gestiona las advertencias de los usuarios')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade una advertencia a un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a advertir')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón de la advertencia')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('severidad')
                        .setDescription('Nivel de severidad de la advertencia')
                        .addChoices(
                            { name: '🟡 Leve', value: 'low' },
                            { name: '🟠 Moderada', value: 'medium' },
                            { name: '🔴 Grave', value: 'high' }
                        )
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Ver advertencias de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a consultar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Elimina una advertencia de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a modificar')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('ID de la advertencia a eliminar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Elimina todas las advertencias de un usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a limpiar advertencias')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

    async getWarns(guildId, userId) {
        const warnsPath = path.join(__dirname, '..', 'data', 'moderation', `${guildId}.json`);
        try {
            const data = await fs.readFile(warnsPath, 'utf8');
            const warns = JSON.parse(data);
            return warns[userId] || [];
        } catch (error) {
            return [];
        }
    },

    async saveWarn(guildId, userId, warn) {
        const warnsPath = path.join(__dirname, '..', 'data', 'moderation', `${guildId}.json`);
        try {
            let warns = {};
            try {
                const data = await fs.readFile(warnsPath, 'utf8');
                warns = JSON.parse(data);
            } catch (error) {
                // Si el archivo no existe, comenzamos con un objeto vacío
            }

            if (!warns[userId]) {
                warns[userId] = [];
            }

            warns[userId].push(warn);
            await fs.writeFile(warnsPath, JSON.stringify(warns, null, 2));

            // Aplicar acciones automáticas basadas en número y severidad de warns
            const userWarns = warns[userId];
            const severityCount = {
                low: userWarns.filter(w => w.severity === 'low').length,
                medium: userWarns.filter(w => w.severity === 'medium').length,
                high: userWarns.filter(w => w.severity === 'high').length
            };

            return { success: true, severityCount };
        } catch (error) {
            console.error('Error guardando warn:', error);
            return { success: false, error: error.message };
        }
    },

    async removeWarn(guildId, userId, warnId) {
        const warnsPath = path.join(__dirname, '..', 'data', 'moderation', `${guildId}.json`);
        try {
            const data = await fs.readFile(warnsPath, 'utf8');
            const warns = JSON.parse(data);

            if (!warns[userId] || !warns[userId][warnId]) {
                return false;
            }

            warns[userId].splice(warnId, 1);
            await fs.writeFile(warnsPath, JSON.stringify(warns, null, 2));
            return true;
        } catch (error) {
            return false;
        }
    },

    async clearWarns(guildId, userId) {
        const warnsPath = path.join(__dirname, '..', 'data', 'moderation', `${guildId}.json`);
        try {
            const data = await fs.readFile(warnsPath, 'utf8');
            const warns = JSON.parse(data);
            
            if (warns[userId]) {
                delete warns[userId];
                await fs.writeFile(warnsPath, JSON.stringify(warns, null, 2));
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    },

    // Slash command handler
    async slashExecute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        switch (subcommand) {
            case 'add': {
                const reason = interaction.options.getString('razon');
                const severity = interaction.options.getString('severidad');

                const warn = {
                    reason,
                    severity,
                    moderator: interaction.user.id,
                    timestamp: new Date().toISOString()
                };

                const result = await this.saveWarn(guildId, user.id, warn);
                
                if (result.success) {
                    const severityEmojis = {
                        low: '🟡',
                        medium: '🟠',
                        high: '🔴'
                    };

                    const logSystem = require('../utils/logSystem');
                    
                    // Enviar log y obtener embed de confirmación
                    const confirmationEmbed = await logSystem.sendLog(interaction.guild, 'WARN', {
                        user: user,
                        moderator: interaction.user,
                        reason: reason,
                        severity: severity,
                        caseId: Date.now().toString(36)
                    });

                    if (confirmationEmbed) {
                        // Agregar conteo de advertencias al embed
                        confirmationEmbed.addFields({
                            name: '📊 Advertencias Totales',
                            value: `🟡 Leves: ${result.severityCount.low}\n🟠 Moderadas: ${result.severityCount.medium}\n🔴 Graves: ${result.severityCount.high}`
                        });

                        await interaction.reply({ embeds: [confirmationEmbed] });
                    } else {
                        await interaction.reply({
                            content: '⚠️ Advertencia registrada, pero no se pudo enviar el log.',
                            ephemeral: true
                        });
                    }
                } else {
                    await interaction.reply({
                        content: '❌ Hubo un error al guardar la advertencia.',
                        ephemeral: true
                    });
                }
                break;
            }

            case 'check': {
                const warns = await this.getWarns(guildId, user.id);
                
                if (warns.length === 0) {
                    return interaction.reply({
                        content: `✅ ${user.tag} no tiene advertencias.`,
                        ephemeral: true
                    });
                }

                const severityEmojis = {
                    low: '🟡',
                    medium: '🟠',
                    high: '🔴'
                };

                const embed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle(`📋 Advertencias de ${user.tag}`)
                    .setThumbnail(user.displayAvatarURL())
                    .setDescription(warns.map((warn, index) => {
                        const mod = interaction.guild.members.cache.get(warn.moderator);
                        const date = new Date(warn.timestamp).toLocaleDateString();
                        return `**#${index}** ${severityEmojis[warn.severity]} \`${warn.severity}\`
                               > Razón: ${warn.reason}
                               > Mod: ${mod ? mod.user.tag : 'Desconocido'}
                               > Fecha: ${date}`;
                    }).join('\n\n'))
                    .setFooter({ text: `Total: ${warns.length} advertencia(s)` });

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'remove': {
                const warnId = interaction.options.getInteger('id');
                const success = await this.removeWarn(guildId, user.id, warnId);

                if (success) {
                    await interaction.reply({
                        content: `✅ Advertencia #${warnId} eliminada de ${user.tag}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ No se encontró la advertencia especificada.',
                        ephemeral: true
                    });
                }
                break;
            }

            case 'clear': {
                const success = await this.clearWarns(guildId, user.id);

                if (success) {
                    await interaction.reply({
                        content: `✅ Todas las advertencias de ${user.tag} han sido eliminadas.`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ El usuario no tenía advertencias o hubo un error.',
                        ephemeral: true
                    });
                }
                break;
            }
        }
    }
};