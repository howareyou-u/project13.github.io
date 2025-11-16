const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const levelSystem = require('../utils/levelSystem');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'level',
    description: 'Sistema de niveles y economía',
    enabled: true,

    slashCommand: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Comandos relacionados con niveles y economía')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rank')
                .setDescription('Muestra tu nivel actual o el de otro usuario')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario a consultar')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Muestra el ranking de niveles del servidor'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Reclamar tu recompensa diaria'))
        .toJSON(),

    async slashExecute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'rank': {
                const user = interaction.options.getUser('usuario') || interaction.user;
                const userData = await levelSystem.loadUserData(interaction.guildId, user.id);
                const level = levelSystem.getLevelFromXP(userData.xp);
                const progress = levelSystem.getLevelProgress(userData.xp);

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`📊 Nivel de ${user.tag}`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .addFields(
                        { name: '📈 Progreso', value: progress },
                        { name: '💰 Monedas', value: `${userData.coins || 0} 🪙`, inline: true },
                        { name: '📊 Nivel', value: `${level}`, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'leaderboard': {
                const filePath = require('path').join(__dirname, '..', 'data', 'economy', `${interaction.guildId}.json`);
                let users;
                try {
                    users = JSON.parse(await require('fs').promises.readFile(filePath, 'utf8'));
                } catch (error) {
                    users = {};
                }

                const sortedUsers = Object.entries(users)
                    .map(([id, data]) => ({
                        id,
                        xp: data.xp,
                        level: levelSystem.getLevelFromXP(data.xp)
                    }))
                    .sort((a, b) => b.xp - a.xp)
                    .slice(0, 10);

                const lines = await Promise.all(sortedUsers.map(async (user, index) => {
                    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                    return `${medal} **${index + 1}.** ${member ? member.user.tag : 'Usuario Desconocido'} > Nivel ${user.level} (${user.xp} XP)`;
                }));

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏆 Ranking del Servidor')
                    .setDescription(lines.join('\n'));

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'daily': {
                const userData = await levelSystem.loadUserData(interaction.guildId, interaction.user.id);
                const now = Date.now();
                const lastDaily = userData.lastDaily ? new Date(userData.lastDaily).getTime() : 0;
                const cooldown = 24 * 60 * 60 * 1000; // 24 horas

                if (now - lastDaily < cooldown) {
                    const timeLeft = cooldown - (now - lastDaily);
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);

                    return interaction.reply({
                        content: `❌ Ya has reclamado tu recompensa diaria. Vuelve en ${hours}h ${minutes}m.`,
                        ephemeral: true
                    });
                }

                const reward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
                userData.coins = (userData.coins || 0) + reward;
                userData.lastDaily = now;

                await levelSystem.saveUserData(interaction.guildId, interaction.user.id, userData);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💰 Recompensa Diaria')
                    .setDescription(`¡Has reclamado **${reward}** 🪙!`)
                    .addFields(
                        { name: 'Balance Actual', value: `${userData.coins} 🪙` }
                    )
                    .setFooter({ text: 'Vuelve mañana por más recompensas' });

                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    }
};