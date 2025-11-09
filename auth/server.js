const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URI,
    credentials: true
}));

app.use(express.json());

// Ruta principal para verificar que el servidor está funcionando
app.get('/', (req, res) => {
    res.send('Auth server is running');
});

// Ruta de callback que Discord llamará
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        // Intercambiar el código por un token de acceso
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.REDIRECT_URI
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            throw new Error(tokenData.error_description);
        }

        // Obtener información del usuario
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Obtener los servidores del usuario
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const guildsData = await guildsResponse.json();

        // Redirigir al frontend con el token y la información del usuario
        res.redirect(`${process.env.FRONTEND_URI}/dashboard.html?token=${tokenData.access_token}&user=${encodeURIComponent(JSON.stringify(userData))}&guilds=${encodeURIComponent(JSON.stringify(guildsData))}`);

    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Ruta para verificar el token
app.post('/verify', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    try {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            res.json(userData);
        } else {
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Auth server running on port ${PORT}`);
});