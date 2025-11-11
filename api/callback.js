// Vercel Serverless function: exchanges Discord OAuth2 code for tokens and redirects to the frontend

module.exports = async (req, res) => {
  try {
    const code = req.query.code || (req.body && req.body.code);

    console.log('=== Callback Debug ===');
    console.log('Code:', code);

    if (!code) {
      return res.status(400).send('No code provided');
    }

    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token error', tokenData);
      return res.status(500).send(`Token error: ${tokenData.error_description}`);
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

    console.log('Token obtained successfully');

    // Redirigir al dashboard con token
    let frontend = process.env.FRONTEND_URI || 'https://project13-api.vercel.app';
    
    // Limpiar FRONTEND_URI de caracteres no deseados
    frontend = frontend.replace(/\/$/, '').replace(/\.$/, '').trim();
    
    const redirectUrl = `${frontend}/dashboard.html?token=${encodeURIComponent(tokenData.access_token)}`;

    // Establecer cookies sin HttpOnly para que puedan ser leídas desde JavaScript
    res.setHeader('Set-Cookie', [
      `discord_token=${encodeURIComponent(tokenData.access_token)}; Path=/; Max-Age=86400; Secure; SameSite=Lax`,
      `discord_user=${encodeURIComponent(JSON.stringify(userData))}; Path=/; Max-Age=86400; Secure; SameSite=Lax`
    ]);

    console.log('Redirecting to:', redirectUrl);

    return res.writeHead(302, { Location: redirectUrl }).end();

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(500).send(`Error: ${err.message}`);
  }
};



