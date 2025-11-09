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

function checkAuth() {
    // Comprobar si hay un token en localStorage
    const token = localStorage.getItem('discord_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos del usuario
    loadUserData(token);
}

function loadUserData(token) {
    // Simular carga de datos del usuario
    // En una implementación real, estos datos vendrían de tu backend
    fetch('https://discord.com/api/users/@me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('username').textContent = data.username;
        document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`;
    })
    .catch(error => {
        console.error('Error loading user data:', error);
        logout();
    });
}

function logout() {
    localStorage.removeItem('discord_token');
    window.location.href = 'login.html';
}