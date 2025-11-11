# 🚀 GUÍA RÁPIDA: Conectar tu Bot con la Página Web

## Paso 1: Configurar Environment Variables en Vercel

Abre Vercel → Tu Proyecto → Settings → Environment Variables

Añade esto:
```
CLIENT_ID = tu_client_id
CLIENT_SECRET = tu_client_secret
REDIRECT_URI = https://project13-api.vercel.app/api/callback
FRONTEND_URI = https://project13-api.vercel.app
BOT_TOKEN = tu_bot_token
MONGODB_URI = (opcional) tu_mongodb_connection_string
```

## Paso 2: Obtener tus Credenciales

### Client ID y Client Secret:
1. Ve a https://discord.com/developers/applications
2. Selecciona tu bot
3. Ve a OAuth2 → General
4. Copia Client ID y Client Secret

### Bot Token:
1. En la misma aplicación → Bot
2. Haz clic en "Reset Token"
3. Copia el token

### Redirect URI en Discord:
1. OAuth2 → Redirects
2. Añade: `https://project13-api.vercel.app/api/callback`

## Paso 3: Inicia tu Bot Local

```bash
# Instalar dependencias
npm install discord.js dotenv

# Crear .env en la carpeta del bot
DISCORD_TOKEN=tu_token

# Ejecutar el bot
node index.js
```

Usa el archivo `BOT_EXAMPLE.js` como referencia.

## Paso 4: Flujo de la Aplicación

```
Usuario login → Discord OAuth → Token guardado
                                    ↓
                            Cargar servidores del usuario
                                    ↓
                            Seleccionar un servidor
                                    ↓
                            Ver/Editar configuración
                                    ↓
                            Guardar cambios
                                    ↓
                            Tu bot lee la configuración y actúa
```

## Paso 5: Endpoints Disponibles

### `GET /api/guilds`
Obtiene todos los servidores del usuario

```bash
curl -X GET "http://localhost:3000/api/guilds?token=TOKEN"
```

### `GET /api/guild-config`
Obtiene la configuración de un servidor

```bash
curl -X GET "http://localhost:3000/api/guild-config?guildId=ID&token=TOKEN"
```

### `POST /api/save-config`
Guarda la configuración

```bash
curl -X POST "http://localhost:3000/api/save-config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"guildId":"ID","config":{...}}'
```

## Paso 6: Probar todo junto

1. Haz push a GitHub:
```bash
git add .
git commit -m "Integración completa con bot"
git push
```

2. Vercel redeploy automáticamente

3. Abre https://project13-api.vercel.app

4. Haz login con Discord

5. Deberías ver tus servidores

6. Cambia la configuración y guarda

7. Tu bot debería usar esa configuración

## Troubleshooting

### "Guild not found"
- Verifica que el BOT_TOKEN es correcto
- El bot debe estar en el servidor
- El servidor debe ser visible para el bot

### "Not authorized"
- Solo administradores pueden editar la configuración
- Verifica los permisos del usuario

### "Token invalid"
- El token expiró después de 7 días
- Haz login de nuevo

### La config no se guarda
- Verifica que `/api/save-config` está correctamente configurado
- Revisa los logs en Vercel

## Siguiente: Conectar con Base de Datos

Para una solución más robusta, conecta MongoDB:

1. Crea una cuenta gratis en MongoDB Atlas
2. Obtén la connection string
3. Añádela como MONGODB_URI en Vercel
4. Usa el código de ejemplo en `BOT_INTEGRATION.md`

---

¿Preguntas? Lee `BOT_INTEGRATION.md` para más detalles.
