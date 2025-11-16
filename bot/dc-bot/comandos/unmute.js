const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const tempMuteManager = require('../utils/tempMuteManager');

module.exports = {
    name: 'unmute',
  enabled: true,
    description: 'Remueve el silencio de un usuario',

    slashCommand: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remueve el silencio de un usuario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a des-silenciar')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón para remover el silencio')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

    async slashExecute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        try {
            const muteInfo = await tempMuteManager.getMuteInfo(interaction.guild.id, user.id);
            if (!muteInfo) {
                return interaction.reply({
                    content: '❌ Este usuario no está silenciado.',
                    ephemeral: true
                });
            }

            const success = await tempMuteManager.removeMute(
                interaction.guild.id,
                user.id,
                interaction.user
            );

            if (success) {
                return interaction.reply({
                    content: `✅ ${user.tag} ha sido des-silenciado. Razón: ${reason}`,
                    ephemeral: false
                });
            } else {
                return interaction.reply({
                    content: '❌ No pude remover el silencio del usuario. Verifica mis permisos.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error en comando unmute:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al intentar des-silenciar al usuario.',
                ephemeral: true
            });
        }
    }
};