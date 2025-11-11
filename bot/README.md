# Carpeta `bot/` (ejemplo)

Esta carpeta es un contenedor local donde puedes mantener el código de tu bot (discord.js u otro). Está excluida del repositorio remoto mediante `.gitignore`.

Qué incluir aquí (sugerido):

- `index.js` o `src/` con el código del bot
- `.env` con `DISCORD_TOKEN` y `MONGODB_URI` (NO subir al repo)
- `package.json` y `package-lock.json` (opcional: se pueden versionar)

Cómo usar:

1. Copia `bot/.env.example` a `bot/.env` y rellena las variables.
2. Instala dependencias dentro de la carpeta `bot`:

```powershell
cd bot
npm install discord.js dotenv mongodb
```

3. Ejecuta el bot:

```powershell
node index.js
```

Nota: esta carpeta está diseñada para tu desarrollo local. Si quieres desplegar el bot en un servicio (Heroku, VPS, Docker, Railway, etc.), crea una copia separada y despliega desde allí.
