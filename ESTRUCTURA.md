# 📁 Estructura del Proyecto

## Después de la reorganización:

```
project13.github.io/
├── api/                    # APIs serverless (Vercel Functions)
│   ├── callback.js        # Callback de Discord OAuth
│   ├── verify.js          # Verificación de tokens
│   └── README.md
│
├── public/                 # Archivos estáticos (Frontend)
│   ├── index.html         # Página principal
│   ├── login.html         # Página de login
│   ├── dashboard.html     # Dashboard
│   ├── callback.html      # Callback page (estática)
│   ├── styles.css         # Estilos globales
│   ├── dashboard.js       # Scripts del dashboard
│   └── main-styles.css    # Estilos adicionales
│
├── auth/                   # Autenticación (legacy)
│   ├── auth.js
│   ├── package.json
│   ├── server.js.txt
│   ├── vercel.json
│   └── api/
│
├── vercel.json            # Configuración de Vercel (PRINCIPAL)
├── DEPLOY_VERCEL.md       # Guía de despliegue
├── ESTRUCTURA.md          # Este archivo
└── .gitignore
```

## 🚀 Flujo de despliegue:

1. **Frontend** → Sirve desde `/public/` en Vercel
2. **Backend** → APIs en `/api/` (Vercel Serverless Functions)
3. **OAuth Flow**:
   - Frontend → Discord (redirect_uri: `https://project13-api.vercel.app/api/callback`)
   - Backend procesa y redirige a frontend con token
   - Frontend almacena en localStorage

## ✅ Cambios realizados:

- ✅ Archivos estáticos en `public/`
- ✅ APIs en `api/`
- ✅ Eliminados duplicados de la raíz
- ✅ vercel.json configurado para servir desde `public/`
- ✅ Rutas relativas (`./`) en todos los HTML
- ✅ redirect_uri apunta a `https://project13-api.vercel.app/api/callback`

## ⚙️ Variables de entorno en Vercel:

```
CLIENT_ID = 1200476680280608958
CLIENT_SECRET = [tu_secret]
REDIRECT_URI = https://project13-api.vercel.app/api/callback
FRONTEND_URI = https://project13-api.vercel.app
```

## 📝 Notas:

- Los archivos en la raíz han sido eliminados para evitar confusiones
- GitHub Pages puede servir desde `/public/` si lo necesitas (configurar en repo settings)
- Vercel es ahora el despliegue principal con backend funcional
