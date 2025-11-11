// Funciones del Dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Comprobar si el usuario está autenticado
    checkAuth();

    // Manejar el cierre de sesión
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
}

function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function checkAuth() {
    // Intentar obtener token de URL, cookies o localStorage (en ese orden)
    let token = getUrlParam('token') || getCookie('discord_token') || localStorage.getItem('discord_token');
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = './login.html';
        return;
    }

    // Guardar token en localStorage para acceso futuro
    localStorage.setItem('discord_token', token);

    // Intentar obtener userData de cookies o localStorage
    let userData = getCookie('discord_user') || localStorage.getItem('discord_user');
    
    if (userData) {
        try {
            userData = JSON.parse(userData);
            localStorage.setItem('discord_user', JSON.stringify(userData));
            displayUserData(userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
            loadUserData(token);
        }
    } else {
        // Si no tenemos userData, cargarla desde la API de Discord
        loadUserData(token);
    }

    // Limpiar URL para evitar que el token quede visible y asegurar que la URL es correcta
    if (token === getUrlParam('token')) {
        // Usar replaceState para no tener el token en el historial
        const cleanUrl = window.location.origin + '/dashboard.html';
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

function displayUserData(userData) {
    if (userData && userData.username) {
        const usernameEl = document.getElementById('username');
        const avatarEl = document.getElementById('user-avatar');
        
        if (usernameEl) {
            usernameEl.textContent = userData.username;
        }
        
        if (avatarEl && userData.id && userData.avatar) {
            avatarEl.src = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
        }
    }
}

function loadUserData(token) {
    // Cargar datos del usuario desde Discord API
    fetch('https://discord.com/api/users/@me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load user data');
        }
        return response.json();
    })
    .then(data => {
        if (data.username) {
            localStorage.setItem('discord_user', JSON.stringify(data));
            displayUserData(data);
        } else {
            logout();
        }
    })
    .catch(error => {
        console.error('Error loading user data:', error);
        logout();
    });
}

function logout() {
    // Limpiar cookies
    document.cookie = 'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'discord_guilds=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Limpiar localStorage
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_user');
    localStorage.removeItem('discord_guilds');
    
    // Redirigir a login
    window.location.href = './login.html';
}

