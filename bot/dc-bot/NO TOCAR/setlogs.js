const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuración de tipos de logs
const LOG_TYPES = {
    moderation: {
        name: 'Moderación',
        emoji: '�️',
        color: '#FF0000',
        description: 'Registro de acciones de moderación',
        events: [
            'Usuario baneado',
            'Usuario desbaneado',
            'Usuario expulsado',
            'Usuario silenciado',
            'Usuario desilenciado',
            'Usuario advertido'
        ]
    },
    messages: {
        name: 'Mensajes',
  enabled: true,
        emoji: '�',
        color: '#4ECDC4',
        description: 'Registro de actividad de mensajes',
        events: [
            'Mensaje eliminado',
            'Mensaje editado'
        ]
    },
    server: {
        name: 'Servidor',
        emoji: '🏰',
        color: '#45B7D1',
        description: 'Registro de cambios en el servidor',
        events: [
            'Canal creado',
            'Canal eliminado',
            'Canal actualizado',
            'Rol creado',
            'Rol eliminado',
            'Rol actualizado'
        ]
    },
    members: {
        name: 'Miembros',
        emoji: '👥',
        color: '#77DD77',
        description: 'Registro de actividad de miembros',
        events: [
            'Miembro unido',
            'Miembro salió',
            'Miembro actualizado'
        ]
    },
    voice: {
        name: 'Canales de Voz',
        emoji: '🎙️',
        color: '#FFB347',
        description: 'Registro de actividad en canales de voz',
        events: [
            'Unión a canal de voz',
            'Salida de canal de voz',
            'Movimiento entre canales',
            'Silenciado en voz',
            'Ensordecido en voz'
        ]
    }
};

module.exports = {
    name: 'setlogs',
    description: 'Configura los canales para diferentes tipos de logs',

    slashCommand: new SlashCommandBuilder()
        .setName('setlogs')
        .setDescription('Configura los canales para diferentes tipos de logs')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal donde se enviarán los logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('panel')
                .setDescription('Tipo de logs para este canal')
                .setRequired(true)
                .addChoices(
                    { name: '�️ Moderación', value: 'moderation' },
                    { name: '� Mensajes', value: 'messages' },
                    { name: '🏰 Servidor', value: 'server' },
                    { name: '👥 Miembros', value: 'members' },
                    { name: '🎙️ Canales de Voz', value: 'voice' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON(),

    async slashExecute(interaction) {
        const channel = interaction.options.getChannel('canal');
        const panel = interaction.options.getString('panel');
        
        // Verificar permisos
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return interaction.reply({
                content: '❌ No tengo los permisos necesarios en ese canal. Necesito poder enviar mensajes y embeds.',
                ephemeral: true
            });
        }

        // Cargar configuración actual
        const configPath = path.join(__dirname, '..', 'data', 'config.json');
        let config = {};

        try {
            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(data);
            }
        } catch (error) {
            // Si el archivo no existe, comenzamos con un objeto vacío
        }

        // Inicializar configuración del servidor si no existe
        if (!config[interaction.guildId]) {
            config[interaction.guildId] = { logChannels: {} };
        }

        // Asegurar que existe la estructura de logChannels
        if (!config[interaction.guildId].logChannels) {
            config[interaction.guildId].logChannels = {};
        }

        // Actualizar configuración
        config[interaction.guildId].logChannels[panel] = channel.id;

        // Guardar configuración
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Crear embed de confirmación
        const logType = LOG_TYPES[panel];
        const embed = new EmbedBuilder()
            .setColor(logType.color)
            .setTitle(`${logType.emoji} Canal de Logs: ${logType.name}`)
            .setDescription(logType.description)
            .addFields(
                { 
                    name: '� Eventos Registrados', 
                    value: logType.events.map(event => `• ${event}`).join('\n') 
                },
                { 
                    name: '🔧 Configuración', 
                    value: `Canal: ${channel}\nTipo: ${logType.name}` 
                }
            )
            .setFooter({ 
                text: `Configurado por ${interaction.user.tag}` 
            })
            .setTimestamp();

        // Enviar mensaje de confirmación al canal de logs
        await channel.send({ embeds: [embed] });

        // Responder al comando
        return interaction.reply({
            content: `✅ Canal de logs para ${logType.emoji} ${logType.name} configurado en ${channel}`,
            ephemeral: true
        });
    }
};