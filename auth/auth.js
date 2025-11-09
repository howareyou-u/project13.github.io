// Función para manejar el proceso de autenticación
function handleAuth() {
    // Guardar la URL actual para redireccionar después del login
    localStorage.setItem('auth_redirect', window.location.href);
    
    // Redirigir a Discord para autenticación
    window.location.href = 'https://discord.com/api/oauth2/authorize' +
        '?client_id=1200476680280608958' +
        '&redirect_uri=' + encodeURIComponent('https://howareyou-u.github.io/project13.github.io/callback') +
        '&response_type=code' +
        '&scope=identify%20guilds';
}

// Función para verificar si el usuario está autenticado
async function checkAuth() {
    const token = localStorage.getItem('discord_token');
    
    if (!token) {
        return false;
    }

    try {
        const response = await fetch('https://howareyou-u.github.io/project13.github.io/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            localStorage.removeItem('discord_token');
            return false;
        }

        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('discord_token');
        return false;
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_user');
    localStorage.removeItem('discord_guilds');
    window.location.href = '/';
}

// Manejar la respuesta del callback
function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const user = urlParams.get('user');
    const guilds = urlParams.get('guilds');

    if (token && user && guilds) {
        localStorage.setItem('discord_token', token);
        localStorage.setItem('discord_user', user);
        localStorage.setItem('discord_guilds', guilds);

        // Redirigir a la página anterior o al dashboard
        const redirectUrl = localStorage.getItem('auth_redirect') || '/dashboard.html';
        localStorage.removeItem('auth_redirect');
        window.location.href = redirectUrl;
    }
}

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const userData = await checkAuth();
    const loginButton = document.querySelector('.login-button');
    const dashboardButton = document.getElementById('dashboard-link');

    if (userData) {
        // Usuario autenticado
        if (loginButton) {
            loginButton.innerHTML = `
                <img src="https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png" alt="${userData.username}" class="user-avatar">
                ${userData.username}
            `;
            loginButton.onclick = logout;
        }
        if (dashboardButton) {
            dashboardButton.href = '/dashboard.html';
        }
    } else {
        // Usuario no autenticado
        if (loginButton) {
            loginButton.onclick = handleAuth;
        }
        if (dashboardButton) {
            dashboardButton.href = '#';
            dashboardButton.onclick = handleAuth;
        }
    }

    // Si estamos en la página de callback, manejar la respuesta
    if (window.location.pathname === '/callback') {
        handleCallback();
    }
});