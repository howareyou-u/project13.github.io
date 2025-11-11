// Funciones del Dashboard
let currentToken = null;
let currentGuild = null;
let currentConfig = null;

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

    // Cargar guilds después de autenticar
    setTimeout(() => {
        if (currentToken) {
            loadGuilds();
        }
    }, 500);
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

    currentToken = token;

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
    fetch('https://discord.com/api/v10/users/@me', {
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

// Cargar servidores del usuario
async function loadGuilds() {
    try {
        const response = await fetch(`/api/guilds?token=${encodeURIComponent(currentToken)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Error loading guilds:', data.error);
            return;
        }

        console.log('Guilds loaded:', data.guilds);
        displayGuildSelector(data.guilds);

    } catch (error) {
        console.error('Error loading guilds:', error);
    }
}

// Mostrar selector de servidores
function displayGuildSelector(guilds) {
    // Crear un modal o dropdown para seleccionar servidor
    let guildHtml = '<select id="guild-select" onchange="loadGuildConfig(this.value)">';
    guildHtml += '<option value="">Selecciona un servidor...</option>';
    
    guilds.forEach(guild => {
        guildHtml += `<option value="${guild.id}">${guild.name}</option>`;
    });
    
    guildHtml += '</select>';

    // Insertar en algún lugar visible (puedes ajustar esto)
    const guildSelector = document.getElementById('guild-selector');
    if (guildSelector) {
        guildSelector.innerHTML = guildHtml;
    }
}

// Cargar configuración de un servidor específico
async function loadGuildConfig(guildId) {
    if (!guildId) return;

    try {
        const response = await fetch(
            `/api/guild-config?guildId=${guildId}&token=${encodeURIComponent(currentToken)}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Error loading guild config:', data.error);
            return;
        }

        currentGuild = data.guild;
        currentConfig = data.config;

        console.log('Guild config loaded:', data);
        populateDashboard(data.config, data.channels);

    } catch (error) {
        console.error('Error loading guild config:', error);
    }
}

// Llenar el dashboard con la configuración actual
function populateDashboard(config, channels) {
    // Llenar selects de canales
    const channelSelects = document.querySelectorAll('select');
    let channelOptions = '<option value="">Selecciona un canal</option>';
    
    channels?.forEach(channel => {
        channelOptions += `<option value="${channel.id}">#${channel.name}</option>`;
    });

    channelSelects.forEach(select => {
        if (!select.id.includes('guild')) {
            select.innerHTML = channelOptions;
        }
    });

    // Llenar campos de configuración
    if (config.welcome) {
        const welcomeToggle = document.getElementById('welcomeEnabled');
        if (welcomeToggle) welcomeToggle.checked = config.welcome.enabled;
    }

    if (config.prefix) {
        const prefixInput = document.querySelector('input[placeholder="!"]');
        if (prefixInput) prefixInput.value = config.prefix;
    }

    console.log('Dashboard populated with config');
}

// Guardar configuración
async function saveGuildConfig() {
    if (!currentGuild) {
        alert('Por favor selecciona un servidor primero');
        return;
    }

    // Recopilar configuración actual del formulario
    const config = {
        welcome: {
            enabled: document.getElementById('welcomeEnabled')?.checked || false,
            channel: document.querySelector('select')?.value,
            message: document.querySelector('textarea')?.value || ''
        },
        prefix: document.querySelector('input[placeholder="!"]')?.value || '!'
    };

    try {
        const response = await fetch('/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                guildId: currentGuild.id,
                config: config
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Configuración guardada correctamente');
            currentConfig = config;
        } else {
            alert('Error al guardar: ' + data.error);
        }

    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error al guardar la configuración');
    }
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
    
    // Limpiar variables globales
    currentToken = null;
    currentGuild = null;
    currentConfig = null;
    
    // Redirigir a login
    window.location.href = './login.html';
}

