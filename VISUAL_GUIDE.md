# 🎮 VINCULAR BOT CON PÁGINA WEB - GUÍA VISUAL

## 📊 Vista General del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                    TU PÁGINA WEB                             │
│            https://project13-api.vercel.app                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dashboard                                           │   │
│  │ ┌─────────────────────────────────────────────┐    │   │
│  │ │ 📬 Mensajes                                 │    │   │
│  │ │  • Bienvenidas                              │    │   │
│  │ │  • Despedidas                               │    │   │
│  │ │  • Invite Tracker                           │    │   │
│  │ ├─────────────────────────────────────────────┤    │   │
│  │ │ 🛡️  Moderación                             │    │   │
│  │ │  • AutoMod                                  │    │   │
│  │ │  • Logs                                     │    │   │
│  │ │  • Infracciones                             │    │   │
│  │ ├─────────────────────────────────────────────┤    │   │
│  │ │ ⚙️  Sistema                                 │    │   │
│  │ │  • Configuración General                    │    │   │
│  │ │  • Estadísticas                             │    │   │
│  │ └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            ↕️ (APIs)
┌──────────────────────────────────────────────────────────────┐
│                 SERVIDOR VERCEL (Backend)                    │
│                                                               │
│  /api/callback      → Intercambia código OAuth             │
│  /api/guilds        → Obtiene tus servidores               │
│  /api/guild-config  → Obtiene configuración                │
│  /api/save-config   → Guarda cambios                       │
└──────────────────────────────────────────────────────────────┘
                            ↕️
┌──────────────────────────────────────────────────────────────┐
│              TU BOT DE DISCORD (Local)                       │
│                                                               │
│  Lee la configuración y ejecuta:                            │
│  • Envía bienvenidas                                        │
│  • Envía despedidas                                         │
│  • Rastrea invitaciones                                     │
│  • Modera el servidor                                       │
│  • Toca música                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 FLUJO DE USUARIO

### 1️⃣ Usuario Hace Login
```
Usuario entra a https://project13-api.vercel.app
            ↓
Hace clic en "Iniciar Sesión"
            ↓
Se abre ventana de Discord
            ↓
Usuario autoriza la aplicación
            ↓
Discord envía código a /api/callback
```

### 2️⃣ Backend Procesa Login
```
/api/callback recibe código
            ↓
Intercambia código por token de acceso
            ↓
Obtiene datos del usuario desde Discord
            ↓
Guarda token en cookies
            ↓
Redirige al dashboard
```

### 3️⃣ Dashboard Carga
```
dashboard.js verifica el token
            ↓
Llama a /api/guilds
            ↓
Obtiene lista de servidores donde eres admin
            ↓
Muestra dropdown para seleccionar servidor
```

### 4️⃣ Usuario Selecciona Servidor
```
Usuario abre dropdown y selecciona servidor
            ↓
dashboard.js llama a /api/guild-config
            ↓
Obtiene:
  • Canales del servidor
  • Configuración actual
            ↓
Rellena formularios con los datos
```

### 5️⃣ Usuario Edita y Guarda
```
Usuario:
  • Activa bienvenidas
  • Selecciona canal
  • Escribe mensaje personalizado
  • Hace clic "Guardar"
            ↓
dashboard.js llama a /api/save-config
            ↓
Backend valida permisos
            ↓
Guarda la configuración
            ↓
Muestra confirmación
```

### 6️⃣ Tu Bot Actúa
```
Tu bot.js lee la configuración
            ↓
Cuando alguien entra al servidor:
  • Lee config.welcome
  • Si está habilitada
  • Envía el mensaje al canal configurado
  • Reemplaza {user} con el nombre real
```

---

## 📋 CHECKLIST: Pasos para Implementar

### ✅ Paso 1: Crear Bot en Discord Developer Portal
- [ ] Ir a https://discord.com/developers/applications
- [ ] Crear "New Application"
- [ ] Ir a "Bot" → "Add Bot"
- [ ] Ir a "OAuth2" → "General"
- [ ] Copiar Client ID
- [ ] Copiar Client Secret (no compartir!)
- [ ] Ir a "General Information" → Copiar Application ID
- [ ] Ir a "Bot" → Copiar Token (no compartir!)
- [ ] Ir a "OAuth2" → "URL Generator"
  - [ ] Scopes: `identify`, `guilds`
  - [ ] Permissions: (por ahora ninguno)
  - [ ] Copiar URL generada
- [ ] Abre la URL en navegador para invitar el bot a tu servidor

### ✅ Paso 2: Configurar Variables en Vercel
- [ ] Abre Vercel Dashboard
- [ ] Selecciona tu proyecto
- [ ] Settings → Environment Variables
- [ ] Añade:
  ```
  CLIENT_ID = tu_client_id_aqui
  CLIENT_SECRET = tu_client_secret_aqui
  REDIRECT_URI = https://project13-api.vercel.app/api/callback
  FRONTEND_URI = https://project13-api.vercel.app
  BOT_TOKEN = tu_bot_token_aqui
  ```
- [ ] Guarda cambios (Vercel redeploy automáticamente)

### ✅ Paso 3: Configurar Redirect URI en Discord
- [ ] Discord Developer Portal → Tu aplicación
- [ ] OAuth2 → Redirects
- [ ] Añade: `https://project13-api.vercel.app/api/callback`
- [ ] Guarda

### ✅ Paso 4: Crear tu Bot Local
- [ ] Crea una carpeta para tu bot: `mkdir mi-bot`
- [ ] Entra en la carpeta: `cd mi-bot`
- [ ] Inicializa npm: `npm init -y`
- [ ] Instala discord.js: `npm install discord.js dotenv`
- [ ] Copia `BOT_EXAMPLE.js` de tu proyecto
- [ ] Modifica según necesites
- [ ] Crea `.env`:
  ```
  DISCORD_TOKEN=tu_bot_token
  ```
- [ ] Ejecuta: `node index.js`

### ✅ Paso 5: Prueba Todo
- [ ] Vercel ha redeploy (3-5 min)
- [ ] Abre https://project13-api.vercel.app
- [ ] Haz login con Discord
- [ ] Deberías ver tus servidores en dropdown
- [ ] Selecciona uno
- [ ] Modifica un campo (ej: habilitar bienvenidas)
- [ ] Haz clic "Guardar"
- [ ] Revisa logs en Vercel para ver si se guardó
- [ ] Tu bot local debería usar esa configuración

---

## 🔍 VARIABLES DE ENTORNO EXPLICADAS

### CLIENT_ID
- Identificador único de tu aplicación en Discord
- 18-20 dígitos
- Visible públicamente, no es secreto
- Obtienes de Discord Developer Portal

### CLIENT_SECRET
- Contraseña de tu aplicación
- **NUNCA compartas esto públicamente**
- Obtienes de Discord Developer Portal
- Úsalo en Vercel Environment Variables

### BOT_TOKEN
- Token para que tu bot se conecte a Discord
- **NUNCA compartas esto públicamente**
- Obtienes de Discord Developer Portal → Bot
- Lo usas solo en tu bot local (en .env)

### REDIRECT_URI
- URL a la que Discord envía el código después del login
- Debe ser: `https://project13-api.vercel.app/api/callback`
- Debe coincidir exactamente con lo que pones en Discord

### FRONTEND_URI
- URL base de tu página web
- Debe ser: `https://project13-api.vercel.app`
- Sin barra final

---

## 📁 ESTRUCTURA DE ARCHIVOS

```
proyecto/
├── api/
│   ├── callback.js              ← OAuth2 exchange
│   ├── verify.js                ← Verificar token
│   ├── guilds.js                ← Obtener servidores
│   ├── guild-config.js          ← Obtener configuración
│   └── save-config.js           ← Guardar configuración
│
├── dashboard.html               ← Interfaz web
├── dashboard.js                 ← Lógica de dashboard
├── login.html                   ← Página de login
├── styles.css                   ← Estilos globales
│
├── BOT_EXAMPLE.js               ← Ejemplo de bot (discord.js)
├── BOT_INTEGRATION.md           ← Documentación completa
├── QUICK_START.md               ← Guía rápida
├── INTEGRATION_SUMMARY.md       ← Resumen
└── vercel.json                  ← Configuración Vercel

tu-bot/ (CARPETA SEPARADA)
├── index.js                     ← Tu bot
├── .env                         ← DISCORD_TOKEN
└── package.json
```

---

## 🆘 TROUBLESHOOTING

### ❌ "Guild not found"
**Causa:** El bot no está en el servidor o no tiene permisos
**Solución:**
1. Abre tu URL OAuth2 generada en Discord Dev Portal
2. Invita el bot a tu servidor
3. Dale permisos administrativos al bot
4. Reinicia el bot local

### ❌ "Not authorized"
**Causa:** Solo admins pueden editar
**Solución:**
1. Haz login con la cuenta administradora del servidor
2. O asigna permisos administrativos a tu usuario

### ❌ "Token invalid"
**Causa:** Token expiró (7 días) o es incorrecto
**Solución:**
1. Haz logout y login nuevamente
2. O reinicia el bot con nuevo BOT_TOKEN

### ❌ La config no se guarda
**Causa:** `/api/save-config` no funcionando
**Solución:**
1. Revisa los logs en Vercel Console
2. Verifica que POST request se está enviando
3. Asegúrate de que tienes las variables de entorno

### ❌ El bot no funciona localmente
**Causa:** Varios posibles
**Solución:**
1. Verifica que DISCORD_TOKEN es correcto
2. Comprueba que el bot está online: `node index.js`
3. Revisa console por errores
4. Asegúrate que el bot está en el servidor

---

## 🚀 PRÓXIMOS PASOS

1. **Conectar Base de Datos**
   - Usa MongoDB para guardar configs en la nube
   - Así múltiples servidores funcionan mejor

2. **Agregar más Funcionalidades**
   - Moderación: kick, ban, mute
   - Entretenimiento: juegos
   - Música: play, pause, skip

3. **Mejorar Dashboard**
   - Editor visual de mensajes
   - Preview de cómo se verá
   - Más opciones de personalización

4. **Sistema de Tickets**
   - Crear tickets de soporte
   - Asignar moderadores

---

## 📞 ¿Necesitas Ayuda?

1. Lee `BOT_INTEGRATION.md` (documentación completa)
2. Revisa `BOT_EXAMPLE.js` para ver un ejemplo funcional
3. Comprueba los logs en Vercel Dashboard
4. Verifica que todas las variables de entorno están correctas

---

**¡Listo! Ahora tienes una integración completa entre tu página web y tu bot de Discord!** 🎉
