const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const tempMuteManager = require('../utils/tempMuteManager');

module.exports = {
    name: 'tempmute',
  enabled: true,
    description: 'Silencia temporalmente a un usuario',

    slashCommand: new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('Silencia temporalmente a un usuario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a silenciar')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duracion')
                .setDescription('Duración del silencio (ej: 1h 30m, 2d, 45s)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón del silencio temporal')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

    async slashExecute(interaction) {
        const user = interaction.options.getUser('usuario');
        const durationStr = interaction.options.getString('duracion');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        try {
            // Verificar si el usuario puede ser muteado
            const member = await interaction.guild.members.fetch(user.id);
            if (!member.moderatable) {
                return interaction.reply({
                    content: '❌ No puedo silenciar a este usuario. Es posible que tenga un rol más alto que el mío.',
                    ephemeral: true
                });
            }

            // Verificar si ya está muteado
            const currentMute = await tempMuteManager.getMuteInfo(interaction.guild.id, user.id);
            if (currentMute) {
                const remaining = await tempMuteManager.getRemainingTime(interaction.guild.id, user.id);
                return interaction.reply({
                    content: `❌ Este usuario ya está silenciado. Tiempo restante: ${tempMuteManager.formatDuration(remaining)}`,
                    ephemeral: true
                });
            }

            // Parsear duración
            const duration = tempMuteManager.parseDuration(durationStr);
            if (duration <= 0) {
                return interaction.reply({
                    content: '❌ Duración inválida. Usa formatos como "1h 30m", "2d", "45s".',
                    ephemeral: true
                });
            }

            // Aplicar mute temporal
            const success = await tempMuteManager.addMute(
                interaction.guild,
                user,
                interaction.user,
                duration,
                reason
            );

            if (success) {
                return interaction.reply({
                    content: `✅ ${user.tag} ha sido silenciado por ${tempMuteManager.formatDuration(duration)}. Razón: ${reason}`,
                    ephemeral: false
                });
            } else {
                return interaction.reply({
                    content: '❌ No pude silenciar al usuario. Verifica mis permisos.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error en comando tempmute:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al intentar silenciar al usuario.',
                ephemeral: true
            });
        }
    }
};