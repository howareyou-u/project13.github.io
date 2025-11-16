# 🔒 Guía de Seguridad - Protección de Tokens

## ⚠️ IMPORTANTE: Si tu token ya fue expuesto

Si ya subiste tu token a GitHub, **DEBES REVOCARLO INMEDIATAMENTE**:

1. Ve a https://discord.com/developers/applications
2. Selecciona tu aplicación
3. Ve a la sección "Bot"
4. Haz clic en "Reset Token" o "Regenerate Token"
5. Guarda el nuevo token de forma segura

## ✅ Configuración Segura

### 1. Crear archivo .env

Copia el archivo de ejemplo y crea tu archivo `.env`:

```bash
cd bot/dc-bot
copy .env.example .env
```

O en PowerShell:
```powershell
cd bot/dc-bot
Copy-Item .env.example .env
```

### 2. Editar .env con tus credenciales

Abre el archivo `.env` y completa con tus valores reales:

```env
DISCORD_TOKEN=tu_token_real_aqui
CLIENT_ID=tu_client_id_real
GUILD_ID=tu_guild_id_real
```

### 3. Verificar que .env está en .gitignore

El archivo `.gitignore` ya está configurado para ignorar:
- `.env`
- `.env.local`
- `*.env` (excepto `*.env.example`)
- Archivos con nombres que contengan: `token`, `secret`, `key`, `password`, `credential`

### 4. Verificar antes de hacer commit

Antes de hacer `git add` y `git commit`, verifica que no estás subiendo archivos sensibles:

```bash
git status
```

Si ves algún archivo `.env` en la lista, **NO lo agregues**.

### 5. Si accidentalmente subiste un token

Si ya hiciste commit con un token:

1. **REVOCA EL TOKEN INMEDIATAMENTE** (ver arriba)
2. Elimina el token del historial de Git:

```bash
# Eliminar el archivo del historial
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch bot/dc-bot/.env" --prune-empty --tag-name-filter cat -- --all

# O usar BFG Repo-Cleaner (más rápido)
# https://rtyley.github.io/bfg-repo-cleaner/
```

3. Fuerza el push (⚠️ ADVERTENCIA: esto reescribe el historial):

```bash
git push origin --force --all
```

## 🛡️ Mejores Prácticas

1. **NUNCA** hardcodees tokens en el código
2. **SIEMPRE** usa variables de entorno
3. **VERIFICA** `.gitignore` antes de cada commit
4. **REVISA** los archivos antes de hacer push
5. **USA** GitHub Secrets para CI/CD si usas GitHub Actions

## 📝 Variables de Entorno Requeridas

- `DISCORD_TOKEN`: Token del bot (obligatorio)
- `CLIENT_ID`: ID de la aplicación (obligatorio)
- `GUILD_ID`: ID del servidor (opcional, para desarrollo)
- `ADMIN_TOKEN`: Token de administración (opcional)
- `MONGODB_URI`: URI de MongoDB (opcional)
- `MONGODB_DB`: Nombre de la base de datos (opcional)
- `INTERNAL_PORT`: Puerto para endpoints internos (opcional)

## 🔍 Verificar que no hay tokens expuestos

Puedes buscar en tu código:

```bash
# Buscar posibles tokens hardcodeados
grep -r "MTIwMDQ3NjY4MDI4MDYwODk1OA" .
grep -r "TOKEN.*=.*['\"]" .
```

Si encuentras algo, elimínalo inmediatamente y revoca el token.

