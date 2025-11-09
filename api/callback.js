// Vercel Serverless function: exchanges Discord OAuth2 code for tokens and redirects to the frontend
const fetch = global.fetch || require('node-fetch');

module.exports = async (req, res) => {
  try {
    const code = req.query.code || (req.body && req.body.code);

    if (!code) {
      return res.status(400).send('No code provided');
    }

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
      console.error('Token error', tokenData);
      return res.status(500).json({ error: 'Token exchange failed' });
    }

    // Get user info
    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResp.json();

    // Get guilds
    const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const guildsData = await guildsResp.json();

    // Redirect back to frontend (GitHub Pages) carrying token and user info
    const frontend = process.env.FRONTEND_URI || 'https://howareyou-u.github.io/project13.github.io';
    const redirectUrl = `${frontend}/dashboard.html?token=${encodeURIComponent(tokenData.access_token)}&user=${encodeURIComponent(JSON.stringify(userData))}&guilds=${encodeURIComponent(JSON.stringify(guildsData))}`;

    return res.writeHead(302, { Location: redirectUrl }).end();

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
