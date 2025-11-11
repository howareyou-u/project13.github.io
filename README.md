# Project 13 - Discord Bot

## 🚀 Arquitectura Actual

### Frontend + Backend: Vercel
- **URL Principal**: https://project13-api.vercel.app
- **Frontend**: index.html, login.html, dashboard.html, styles.css, dashboard.js
- **Backend**: `/api/callback`, `/api/verify` (Serverless Functions)

### GitHub Pages (Respaldo)
- **URL**: https://howareyou-u.github.io/project13.github.io/
- Redirige automáticamente a Vercel
- Útil para visualizar el código fuente

## 📁 Estructura del Proyecto

```
project13.github.io/
├── index.html              # Página principal
├── login.html             # Página de login
├── dashboard.html         # Dashboard (protegido)
├── callback.html          # Página de callback estática
├── styles.css             # Estilos globales
├── main-styles.css        # Estilos adicionales
├── dashboard.js           # Scripts del dashboard
├── api/                   # Serverless Functions (Vercel)
│   ├── callback.js        # Intercambia código OAuth por token
│   ├── verify.js          # Verifica tokens
│   └── README.md
├── auth/                  # Estructura legacy (no usada en prod)
├── vercel.json           # Configuración de Vercel
├── package.json          # Dependencies y Node.js version
├── .nvmrc               # Node.js version
└── README.md            # Este archivo
```

## 🔐 Variables de Entorno (en Vercel)

Configurar en **Settings → Environment Variables → Production**:

```
CLIENT_ID=1200476680280608958
CLIENT_SECRET=[tu_secret_de_discord]
REDIRECT_URI=https://project13-api.vercel.app/api/callback
FRONTEND_URI=https://project13-api.vercel.app
```

## 🔄 Flujo de Autenticación OAuth

1. Usuario hace clic en "Iniciar Sesión" en `index.html`
2. Redirecciona a Discord OAuth con `redirect_uri=https://project13-api.vercel.app/api/callback`
3. Discord valida y redirige con `?code=...`
4. `/api/callback.js` recibe el código:
   - Intercambia código por token con Discord API
   - Obtiene datos del usuario
   - Obtiene servidores del usuario
   - Redirige a `/dashboard.html` con token en URL
5. `dashboard.html` parseа y almacena token en `localStorage`
6. Frontend accede al dashboard con token almacenado

## 🛠️ Cambios de Configuración Principales

- ✅ Frontend + Backend en Vercel (único servidor)
- ✅ Node.js 20.x configurado
- ✅ Rutas estáticas en `vercel.json`
- ✅ APIs serverless en `/api/`
- ✅ GitHub Pages como respaldo
- ✅ Todas las URLs apuntan a Vercel

## 📦 Dependencias

- Node.js 20.x (en Vercel)
- @vercel/node@3.0.13 (runtime)
- node-fetch (para HTTP requests en serverless)

## 🚀 Deployment

### Vercel (Automático)
```bash
git push origin main
```
Vercel detecta cambios y redeploy automáticamente.

### GitHub Pages (Manual, si es necesario)
```bash
git push origin main
```
GitHub Pages sirve desde `/` y redirige a Vercel.

## 📝 Notas

- Las variables de entorno se leen de `process.env` en las APIs
- El frontend usa rutas relativas (`./styles.css`) para compatibilidad
- Discord redirect_uri DEBE coincidir exactamente con lo configurado en Discord Dev Portal
- Los tokens se almacenan en `localStorage` del navegador (cliente-side)

## 🔗 Links Útiles

- **Discord Dev Portal**: https://discord.com/developers/applications
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/howareyou-u/project13.github.io

---

**Última actualización**: 11 de Noviembre, 2025
