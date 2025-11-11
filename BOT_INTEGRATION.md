# 🤖 Integración del Bot de Discord con la Página Web

Esta guía te mostrará cómo vincular tu página web con tu bot de Discord.

## Requisitos

- Un bot de Discord creado en [Discord Developer Portal](https://discord.com/developers/applications)
- Node.js instalado
- Tu código del bot de Discord (discord.js, discord.py, etc.)

## Paso 1: Obtener las Credenciales del Bot

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. Ve a **OAuth2** → **General**
4. Copia el **Client ID** y **Client Secret**
5. En **OAuth2** → **Redirect URLs**, añade:
   ```
   https://project13-api.vercel.app/api/callback
   ```

## Paso 2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel y en **Settings** → **Environment Variables**, añade:

```
CLIENT_ID=tu_client_id_aqui
CLIENT_SECRET=tu_client_secret_aqui
REDIRECT_URI=https://project13-api.vercel.app/api/callback
FRONTEND_URI=https://project13-api.vercel.app
BOT_TOKEN=tu_bot_token_aqui
```

**Cómo obtener el BOT_TOKEN:**
1. En Discord Developer Portal → Tu aplicación → **Bot**
2. Bajo **TOKEN**, haz clic en **Reset Token** (si aún no existe)
3. Copia el token (guárdalo seguro, no lo compartas)

## Paso 3: Estructura de la Integración

La integración funciona de la siguiente manera:

```
Usuario hace login
       ↓
OAuth2 a Discord
       ↓
/api/callback obtiene el token
       ↓
Guardar token en cookies/localStorage
       ↓
/api/guilds obtiene los servidores del usuario
       ↓
/api/guild-config obtiene la configuración del servidor
       ↓
Dashboard muestra la configuración
       ↓
/api/save-config guarda cambios
```

## Paso 4: Conectar tu Bot (discord.js)

Si tienes un bot en discord.js, aquí está la estructura para conectarlo:

### Estructura de carpetas recomendada:

```
tu-bot/
├── src/
│   ├── index.js (archivo principal)
│   ├── commands/
│   ├── events/
│   └── config/
│       └── guildConfig.js (gestionar configs de servidores)
├── .env
└── package.json
```

### Ejemplo de `guildConfig.js` para guardar/obtener configuración:

```javascript
// src/config/guildConfig.js
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../../guildConfigs');

// Crear directorio si no existe
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

class GuildConfigManager {
  static getConfig(guildId) {
    const filePath = path.join(configDir, `${guildId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return this.getDefaultConfig();
    }
    
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error('Error reading config:', err);
      return this.getDefaultConfig();
    }
  }

  static saveConfig(guildId, config) {
    const filePath = path.join(configDir, `${guildId}.json`);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      console.log(`Config saved for guild: ${guildId}`);
      return true;
    } catch (err) {
      console.error('Error saving config:', err);
      return false;
    }
  }

  static getDefaultConfig() {
    return {
      welcome: {
        enabled: false,
        channel: null,
        message: 'Bienvenido {user}!'
      },
      farewell: {
        enabled: false,
        channel: null,
        message: '{user} nos ha abandonado :('
      },
      prefix: '!',
      automod: {
        enabled: true,
        antiSpam: true,
        antiRaid: true
      },
      music: {
        enabled: true
      }
    };
  }
}

module.exports = GuildConfigManager;
```

### Ejemplo de evento de bienvenida en tu bot:

```javascript
// src/events/guildMemberAdd.js
const { Events } = require('discord.js');
const GuildConfigManager = require('../config/guildConfig');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const config = GuildConfigManager.getConfig(member.guild.id);
      
      if (!config.welcome.enabled || !config.welcome.channel) {
        return;
      }

      const channel = member.guild.channels.cache.get(config.welcome.channel);
      
      if (!channel) {
        console.error('Welcome channel not found');
        return;
      }

      const message = config.welcome.message
        .replace('{user}', member.user.username)
        .replace('{mention}', member.toString())
        .replace('{guild}', member.guild.name);

      await channel.send(message);
      
    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  }
};
```

## Paso 5: Actualizar la API para Usar Base de Datos

Actualmente, los endpoints `/api/guild-config` y `/api/save-config` guardan la configuración localmente. Para una solución más robusta, usa una base de datos:

### Opción A: MongoDB (Recomendado)

```javascript
// api/save-config.js mejorado con MongoDB
const { MongoClient } = require('mongodb');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guildId, config } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !guildId || !config) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db('discord-bot');
    const collection = db.collection('guildConfigs');

    // Actualizar o insertar configuración
    await collection.updateOne(
      { guildId },
      { $set: { config, updatedAt: new Date() } },
      { upsert: true }
    );

    await client.close();

    res.status(200).json({ 
      success: true, 
      message: 'Configuration saved successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Paso 6: Endpoints Disponibles

### `GET /api/guilds?token=TOKEN`
Obtiene todos los servidores donde el usuario es administrador.

**Respuesta:**
```json
{
  "success": true,
  "guilds": [
    {
      "id": "123456789",
      "name": "Mi Servidor",
      "icon": "abc123",
      "permissions": 8
    }
  ]
}
```

### `GET /api/guild-config?guildId=ID&token=TOKEN`
Obtiene la configuración actual de un servidor.

**Respuesta:**
```json
{
  "success": true,
  "guild": {
    "id": "123456789",
    "name": "Mi Servidor",
    "icon": "abc123",
    "ownerId": "987654321"
  },
  "channels": [
    { "id": "111", "name": "general" },
    { "id": "222", "name": "bienvenidos" }
  ],
  "config": {
    "welcome": {
      "enabled": true,
      "channel": "222",
      "message": "Bienvenido!"
    }
  }
}
```

### `POST /api/save-config`
Guarda la configuración de un servidor.

**Body:**
```json
{
  "guildId": "123456789",
  "config": {
    "welcome": {
      "enabled": true,
      "channel": "222",
      "message": "Bienvenido {user}!"
    },
    "prefix": "!"
  }
}
```

## Paso 7: Probar la Integración

1. Haz push de los cambios:
```bash
git add .
git commit -m "Añadir integración con bot"
git push
```

2. Espera a que Vercel redeploy la aplicación

3. Ve a `https://project13-api.vercel.app`

4. Haz login con tu cuenta de Discord

5. Deberías ver tus servidores en el selector

6. Selecciona un servidor y modifica la configuración

7. Los cambios se guardarán cuando hagas clic en "Guardar"

## Solución de Problemas

### Error: "Guild not found"
- Verifica que el `BOT_TOKEN` sea correcto
- Asegúrate de que el bot está en el servidor
- Dale permisos al bot en el servidor

### Error: "Not authorized to modify this guild"
- El usuario debe ser administrador del servidor
- Verifica que los permisos se calculan correctamente en `/api/guilds`

### La configuración no se guarda
- Verifica que tengas un método de almacenamiento (archivo, BD, etc.)
- Comprueba los logs en la consola de Vercel
- Asegúrate que el endpoint `/api/save-config` recibe el POST

## Siguiente Paso: Conectar Comandos del Bot

Puedes sincronizar los comandos de tu bot con el dashboard. Cuando el usuario cambie la configuración desde el dashboard, el bot puede usar esa configuración automáticamente.

**Ejemplo:** Comando `/welcome` que usa la configuración del dashboard:

```javascript
const { SlashCommandBuilder } = require('discord.js');
const GuildConfigManager = require('../config/guildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Enviar mensaje de bienvenida'),
    
  async execute(interaction) {
    const config = GuildConfigManager.getConfig(interaction.guildId);
    
    if (!config.welcome.enabled) {
      return interaction.reply({
        content: 'Los mensajes de bienvenida están deshabilitados',
        ephemeral: true
      });
    }

    const message = config.welcome.message
      .replace('{user}', interaction.user.username)
      .replace('{mention}', interaction.user.toString());

    await interaction.reply(message);
  }
};
```

---

¡Ahora tu página web está completamente conectada con tu bot de Discord! 🎉
