// Funciones del Dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Comprobar si el usuario está autenticado
    checkAuth();

    // Manejar el cierre de sesión
    document.getElementById('logout-button').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
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

function checkAuth() {
    // Comprobar si hay un token en cookies o localStorage
    let token = getCookie('discord_token') || localStorage.getItem('discord_token');
    
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    // Guardar token en localStorage para acceso futuro
    if (!localStorage.getItem('discord_token')) {
        localStorage.setItem('discord_token', token);
    }

    // Cargar datos del usuario desde cookies o localStorage
    let userData = getCookie('discord_user') || localStorage.getItem('discord_user');
    if (userData) {
        try {
            userData = JSON.parse(userData);
            localStorage.setItem('discord_user', JSON.stringify(userData));
            displayUserData(userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    } else {
        loadUserData(token);
    }
}

function displayUserData(userData) {
    if (userData && userData.username) {
        document.getElementById('username').textContent = userData.username;
        if (userData.id && userData.avatar) {
            document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
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
    .then(response => response.json())
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
    // Limpiar cookies y localStorage
    document.cookie = 'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'discord_guilds=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_user');
    localStorage.removeItem('discord_guilds');
    
    window.location.href = './login.html';
}
