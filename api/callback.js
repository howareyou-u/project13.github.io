// Vercel Serverless function: exchanges Discord OAuth2 code for tokens and redirects to the frontend

module.exports = async (req, res) => {
  try {
    const code = req.query.code || (req.body && req.body.code);

    console.log('=== Callback Debug ===');
    console.log('Code:', code);
    console.log('CLIENT_ID:', process.env.CLIENT_ID);
    console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
    console.log('FRONTEND_URI:', process.env.FRONTEND_URI);

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

    console.log('Token Response Status:', tokenResponse.status);
    console.log('Token Data:', tokenData);

    if (tokenData.error) {
      console.error('Token error', tokenData);
      return res.status(500).json({ error: 'Token exchange failed', details: tokenData });
    }

    // Get user info
    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const userData = await userResp.json();

    console.log('User Data:', userData);

    // Get guilds
    const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    const guildsData = await guildsResp.json();

    console.log('Guilds Data:', guildsData);

    // Establecer cookies con los datos
    res.setHeader('Set-Cookie', [
      `discord_token=${encodeURIComponent(tokenData.access_token)}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`,
      `discord_user=${encodeURIComponent(JSON.stringify(userData))}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`,
      `discord_guilds=${encodeURIComponent(JSON.stringify(guildsData))}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`
    ]);

    // Redirect back to frontend sin pasar datos en URL
    const frontend = process.env.FRONTEND_URI || 'https://project13-api.vercel.app';
    const redirectUrl = `${frontend}/dashboard.html?success=true`;

    console.log('Redirecting to:', redirectUrl);

    return res.writeHead(302, { Location: redirectUrl }).end();

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};


