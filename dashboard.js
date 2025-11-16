// Funciones del Dashboard
let currentToken = null;
let currentGuild = null;
let currentConfig = null;
let currentChannels = [];
let allGuilds = [];

// Definición de módulos disponibles
const modules = [
    {
        id: 'welcome',
        icon: 'fa-hand-wave',
        title: 'Bienvenidas',
        description: 'Saluda a los nuevos miembros con mensajes personalizables y roles automáticos.',
        category: 'Mensajes'
    },
    {
        id: 'farewell',
        icon: 'fa-door-open',
        title: 'Despedidas',
        description: 'Envía mensajes cuando los miembros abandonan el servidor.',
        category: 'Mensajes'
    },
    {
        id: 'invite-tracker',
        icon: 'fa-users',
        title: 'Invite Tracker',
        description: 'Rastrea quién invita a nuevos usuarios al servidor.',
        category: 'Mensajes'
    },
    {
        id: 'automod',
        icon: 'fa-shield-alt',
        title: 'AutoMod',
        description: 'Mantén tu servidor seguro con herramientas de moderación automática.',
        category: 'Moderación'
    },
    {
        id: 'logs',
        icon: 'fa-clipboard-list',
        title: 'Logs',
        description: 'Registra y rastrea automáticamente eventos del servidor para referencia fácil.',
        category: 'Moderación'
    },
    {
        id: 'infractions',
        icon: 'fa-gavel',
        title: 'Infracciones',
        description: 'Sistema de infracciones para gestionar advertencias y sanciones.',
        category: 'Moderación'
    },
    {
        id: 'music',
        icon: 'fa-music',
        title: 'Música',
        description: 'Escucha música de alta calidad con tus amigos en el chat de voz.',
        category: 'Música'
    },
    {
        id: 'general',
        icon: 'fa-cog',
        title: 'General',
        description: 'Configuración general del bot como prefijo y opciones básicas.',
        category: 'Sistema'
    }
];

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    setTimeout(() => {
        if (currentToken) {
            loadGuilds();
        }
    }, 500);

    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeInviteModal();
            }
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
    let token = getUrlParam('token') || getCookie('discord_token') || localStorage.getItem('discord_token');
    
    if (!token) {
        window.location.href = './login.html';
        return;
    }

    currentToken = token;
    localStorage.setItem('discord_token', token);

    let userData = getCookie('discord_user') || localStorage.getItem('discord_user');
    
    if (userData) {
        try {
            userData = JSON.parse(userData);
            localStorage.setItem('discord_user', JSON.stringify(userData));
            displayUserData(userData);
        } catch (e) {
            loadUserData(token);
        }
    } else {
        loadUserData(token);
    }

    if (token === getUrlParam('token')) {
        const cleanUrl = window.location.origin + '/dashboard.html';
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

function displayUserData(userData) {
    if (userData && userData.username) {
        const usernameNav = document.getElementById('username-nav');
        const avatarInitials = document.getElementById('user-avatar-initials');
        
        if (usernameNav) {
            usernameNav.textContent = userData.username;
        }
        
        if (avatarInitials) {
            const initials = userData.username.substring(0, 2).toUpperCase();
            avatarInitials.textContent = initials;
            if (userData.avatar) {
                avatarInitials.style.backgroundImage = `url(https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png)`;
                avatarInitials.style.backgroundSize = 'cover';
                avatarInitials.textContent = '';
            }
        }
    }
}

function loadUserData(token) {
    fetch('https://discord.com/api/v10/users/@me', {
        headers: { 'Authorization': `Bearer ${token}` }
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

// Cargar servidores del usuario
async function loadGuilds() {
    try {
        const response = await fetch(`/api/guilds?token=${encodeURIComponent(currentToken)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Error loading guilds:', data.error);
            document.getElementById('servers-grid').innerHTML = '<div class="loading"><p>Error al cargar servidores</p></div>';
            return;
        }

        allGuilds = data.guilds;
        displayServers(data.guilds);

    } catch (error) {
        console.error('Error loading guilds:', error);
        document.getElementById('servers-grid').innerHTML = '<div class="loading"><p>Error al cargar servidores</p></div>';
    }
}

// Mostrar servidores en tarjetas
function displayServers(guilds) {
    const serversGrid = document.getElementById('servers-grid');
    
    if (!guilds || guilds.length === 0) {
        serversGrid.innerHTML = '<div class="loading"><p>No tienes servidores con permisos de administrador</p></div>';
        return;
    }

    serversGrid.innerHTML = guilds.map(guild => {
        const iconUrl = guild.icon 
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
            : null;
        
        const iconDisplay = iconUrl 
            ? `<img src="${iconUrl}" alt="${guild.name}">`
            : `<span>${guild.name.substring(0, 2).toUpperCase()}</span>`;

        return `
            <div class="server-card" onclick="selectGuild('${guild.id}')">
                <div class="server-icon">
                    ${iconDisplay}
                </div>
                <div class="server-info">
                    <div class="server-name">
                        ${guild.name}
                        <i class="fas fa-crown server-crown"></i>
                    </div>
                    <div class="server-id">${guild.id}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Seleccionar un servidor y mostrar vista de configuración
async function selectGuild(guildId) {
    const guild = allGuilds.find(g => g.id === guildId);
    if (!guild) return;

    try {
        const response = await fetch(
            `/api/guild-config?guildId=${guildId}&token=${encodeURIComponent(currentToken)}`
        );
        const data = await response.json();

        // Si el bot no está en el servidor (404 o error de permisos)
        if (!response.ok) {
            if (response.status === 404 || response.status === 403) {
                // Mostrar modal de invitación
                showInviteModal(guild);
                return;
            }
            showNotification('❌ Error al cargar la configuración del servidor', 'error');
            return;
        }

        if (!data.success) {
            showNotification('❌ Error al cargar la configuración del servidor', 'error');
            return;
        }

        currentGuild = data.guild;
        currentConfig = data.config;
        currentChannels = data.channels || [];

        showConfigView();
        displayModules();
        displayGuildInfo(data.guild);

    } catch (error) {
        console.error('Error loading guild config:', error);
        // Si hay un error de red, asumimos que el bot no está
        showInviteModal(guild);
    }
}

// Mostrar modal de invitación
function showInviteModal(guild) {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.classList.add('active');
        // Guardar el guildId para cuando se cierre el modal
        modal.dataset.guildId = guild.id;
        modal.dataset.guildName = guild.name;
    }
}

// Cerrar modal de invitación
function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Abrir enlace de invitación
function openInviteLink() {
    const inviteUrl = 'https://discord.com/api/oauth2/authorize?client_id=1200476680280608958&permissions=8&scope=bot%20applications.commands';
    window.open(inviteUrl, '_blank');
    closeInviteModal();
    showNotification('✅ Abre la nueva pestaña y autoriza el bot. Luego recarga esta página.', 'success');
}

// Mostrar vista de configuración
function showConfigView() {
    document.getElementById('servers-view').style.display = 'none';
    document.getElementById('config-view').classList.add('active');
}

// Mostrar vista de servidores
function showServersView() {
    document.getElementById('servers-view').style.display = 'block';
    document.getElementById('config-view').classList.remove('active');
    currentGuild = null;
    currentConfig = null;
}

// Mostrar información del servidor
function displayGuildInfo(guild) {
    const iconUrl = guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : null;
    
    const iconDisplay = iconUrl 
        ? `<img src="${iconUrl}" alt="${guild.name}">`
        : `<span>${guild.name.substring(0, 2).toUpperCase()}</span>`;

    document.getElementById('guild-icon-large').innerHTML = iconDisplay;
    document.getElementById('guild-name-large').textContent = guild.name;
    document.getElementById('guild-id-large').textContent = guild.id;
}

// Mostrar módulos disponibles
function displayModules() {
    const modulesGrid = document.getElementById('modules-grid');
    const modulePanels = document.getElementById('module-panels');

    // Agrupar módulos por categoría
    const modulesByCategory = {};
    modules.forEach(module => {
        if (!modulesByCategory[module.category]) {
            modulesByCategory[module.category] = [];
        }
        modulesByCategory[module.category].push(module);
    });

    let html = '';
    Object.keys(modulesByCategory).forEach(category => {
        html += `<div style="grid-column: 1 / -1; color: #72767d; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px;">${category}</div>`;
        modulesByCategory[category].forEach(module => {
            html += `
                <div class="module-card" onclick="showModulePanel('${module.id}')" id="module-${module.id}">
                    <div class="module-header">
                        <div>
                            <div class="module-icon"><i class="fas ${module.icon}"></i></div>
                            <div class="module-title">${module.title}</div>
                        </div>
                        <i class="fas fa-pencil module-edit"></i>
                    </div>
                    <div class="module-description">${module.description}</div>
                </div>
            `;
        });
    });

    modulesGrid.innerHTML = html;

    // Crear paneles de configuración
    modulePanels.innerHTML = modules.map(module => createModulePanel(module)).join('');
}

// Crear panel de configuración para un módulo
function createModulePanel(module) {
    const panelId = `panel-${module.id}`;
    
    switch(module.id) {
        case 'welcome':
            return createWelcomePanel(panelId);
        case 'farewell':
            return createFarewellPanel(panelId);
        case 'invite-tracker':
            return createInviteTrackerPanel(panelId);
        case 'automod':
            return createAutoModPanel(panelId);
        case 'logs':
            return createLogsPanel(panelId);
        case 'infractions':
            return createInfractionsPanel(panelId);
        case 'music':
            return createMusicPanel(panelId);
        case 'general':
            return createGeneralPanel(panelId);
        default:
            return `<div class="module-panel" id="${panelId}"><p>Panel no disponible</p></div>`;
    }
}

// Paneles de configuración
function createWelcomePanel(panelId) {
    const channelOptions = currentChannels.map(ch => 
        `<option value="${ch.id}">#${ch.name}</option>`
    ).join('');

    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-hand-wave"></i> Configuración de Bienvenidas</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-toggle-on"></i> Habilitar Bienvenidas</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="welcomeEnabled">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="config-card">
                    <h4><i class="fas fa-hashtag"></i> Canal de Bienvenida</h4>
                    <div class="config-field">
                        <label>Selecciona el canal</label>
                        <select id="welcomeChannel">
                            <option value="">Selecciona un canal</option>
                            ${channelOptions}
                        </select>
                    </div>
                </div>
                <div class="config-card" style="grid-column: 1 / -1;">
                    <h4><i class="fas fa-message"></i> Mensaje Personalizado</h4>
                    <div class="config-field">
                        <label>Mensaje</label>
                        <textarea id="welcomeMessage" rows="4" placeholder="Bienvenido {user} al servidor!"></textarea>
                    </div>
                    <div class="button-group">
                        <button class="btn btn-primary" onclick="saveModuleConfig('welcome')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createFarewellPanel(panelId) {
    const channelOptions = currentChannels.map(ch => 
        `<option value="${ch.id}">#${ch.name}</option>`
    ).join('');

    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-door-open"></i> Configuración de Despedidas</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-toggle-on"></i> Habilitar Despedidas</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="farewellEnabled">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="config-card">
                    <h4><i class="fas fa-hashtag"></i> Canal de Despedida</h4>
                    <div class="config-field">
                        <label>Selecciona el canal</label>
                        <select id="farewellChannel">
                            <option value="">Selecciona un canal</option>
                            ${channelOptions}
                        </select>
                    </div>
                </div>
                <div class="config-card" style="grid-column: 1 / -1;">
                    <h4><i class="fas fa-message"></i> Mensaje Personalizado</h4>
                    <div class="config-field">
                        <label>Mensaje</label>
                        <textarea id="farewellMessage" rows="4" placeholder="{user} nos ha abandonado :("></textarea>
                    </div>
                    <div class="button-group">
                        <button class="btn btn-primary" onclick="saveModuleConfig('farewell')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createInviteTrackerPanel(panelId) {
    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-users"></i> Invite Tracker</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-toggle-on"></i> Habilitar Tracking</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="inviteTrackerEnabled">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="button-group" style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="saveModuleConfig('invite-tracker')">Guardar</button>
                    </div>
                </div>
                <div class="config-card">
                    <h4><i class="fas fa-info-circle"></i> Información</h4>
                    <p style="color: #b5bac1; margin: 0;">Rastrear quién invita a nuevos usuarios al servidor. Se guardará un registro de todas las invitaciones.</p>
                </div>
            </div>
        </div>
    `;
}

function createAutoModPanel(panelId) {
    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-shield-alt"></i> Moderación Automática</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-words"></i> Filtro de Palabras</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="automodWordFilter">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="config-card">
                    <h4><i class="fas fa-spam"></i> Anti-Spam</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="automodAntiSpam">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="config-card">
                    <h4><i class="fas fa-link"></i> Anti-Raid</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="automodAntiRaid">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="config-card" style="grid-column: 1 / -1;">
                    <div class="button-group">
                        <button class="btn btn-primary" onclick="saveModuleConfig('automod')">Guardar Configuración</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createLogsPanel(panelId) {
    const channelOptions = currentChannels.map(ch => 
        `<option value="${ch.id}">#${ch.name}</option>`
    ).join('');

    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-clipboard-list"></i> Logs de Moderación</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-hashtag"></i> Canal de Logs</h4>
                    <div class="config-field">
                        <label>Selecciona el canal</label>
                        <select id="logsChannel">
                            <option value="">Selecciona un canal</option>
                            ${channelOptions}
                        </select>
                    </div>
                    <div class="button-group" style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="saveModuleConfig('logs')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createInfractionsPanel(panelId) {
    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-gavel"></i> Sistema de Infracciones</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-toggle-on"></i> Sistema Activo</h4>
                    <div class="toggle-switch">
                        <label>Activado</label>
                        <label class="switch">
                            <input type="checkbox" id="infractionsEnabled">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="button-group" style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="saveModuleConfig('infractions')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createMusicPanel(panelId) {
    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-music"></i> Configuración de Música</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-toggle-on"></i> Música Habilitada</h4>
                    <div class="toggle-switch">
                        <label>Activada</label>
                        <label class="switch">
                            <input type="checkbox" id="musicEnabled">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="button-group" style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="saveModuleConfig('music')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createGeneralPanel(panelId) {
    return `
        <div class="module-panel" id="${panelId}">
            <div class="panel-header">
                <h3><i class="fas fa-cog"></i> Configuración General</h3>
            </div>
            <div class="config-grid">
                <div class="config-card">
                    <h4><i class="fas fa-tag"></i> Prefijo del Bot</h4>
                    <div class="config-field">
                        <label>Prefijo</label>
                        <input type="text" id="prefixInput" value="!" placeholder="!">
                    </div>
                    <div class="button-group" style="margin-top: 15px;">
                        <button class="btn btn-primary" onclick="saveModuleConfig('general')">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Mostrar panel de módulo
function showModulePanel(moduleId) {
    // Ocultar todos los paneles
    document.querySelectorAll('.module-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Desactivar todas las tarjetas
    document.querySelectorAll('.module-card').forEach(card => {
        card.classList.remove('active');
    });

    // Mostrar el panel seleccionado
    const panel = document.getElementById(`panel-${moduleId}`);
    if (panel) {
        panel.classList.add('active');
        document.getElementById(`module-${moduleId}`).classList.add('active');
        
        // Scroll al panel
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Cargar valores actuales
        loadModuleValues(moduleId);
    }
}

// Cargar valores del módulo
function loadModuleValues(moduleId) {
    if (!currentConfig) return;

    switch(moduleId) {
        case 'welcome':
            if (currentConfig.welcome) {
                const enabled = document.getElementById('welcomeEnabled');
                const channel = document.getElementById('welcomeChannel');
                const message = document.getElementById('welcomeMessage');
                if (enabled) enabled.checked = currentConfig.welcome.enabled || false;
                if (channel && currentConfig.welcome.channel) channel.value = currentConfig.welcome.channel;
                if (message && currentConfig.welcome.message) message.value = currentConfig.welcome.message;
            }
            break;
        case 'farewell':
            if (currentConfig.farewell) {
                const enabled = document.getElementById('farewellEnabled');
                const channel = document.getElementById('farewellChannel');
                const message = document.getElementById('farewellMessage');
                if (enabled) enabled.checked = currentConfig.farewell.enabled || false;
                if (channel && currentConfig.farewell.channel) channel.value = currentConfig.farewell.channel;
                if (message && currentConfig.farewell.message) message.value = currentConfig.farewell.message;
            }
            break;
        case 'invite-tracker':
            if (currentConfig.inviteTracker) {
                const enabled = document.getElementById('inviteTrackerEnabled');
                if (enabled) enabled.checked = currentConfig.inviteTracker.enabled !== false;
            }
            break;
        case 'automod':
            if (currentConfig.automod) {
                const wordFilter = document.getElementById('automodWordFilter');
                const antiSpam = document.getElementById('automodAntiSpam');
                const antiRaid = document.getElementById('automodAntiRaid');
                if (wordFilter) wordFilter.checked = currentConfig.automod.wordFilter || false;
                if (antiSpam) antiSpam.checked = currentConfig.automod.antiSpam !== false;
                if (antiRaid) antiRaid.checked = currentConfig.automod.antiRaid !== false;
            }
            break;
        case 'logs':
            if (currentConfig.logs) {
                const channel = document.getElementById('logsChannel');
                if (channel && currentConfig.logs.channel) channel.value = currentConfig.logs.channel;
            }
            break;
        case 'infractions':
            if (currentConfig.infractions) {
                const enabled = document.getElementById('infractionsEnabled');
                if (enabled) enabled.checked = currentConfig.infractions.enabled !== false;
            }
            break;
        case 'music':
            if (currentConfig.music) {
                const enabled = document.getElementById('musicEnabled');
                if (enabled) enabled.checked = currentConfig.music.enabled !== false;
            }
            break;
        case 'general':
            if (currentConfig.prefix) {
                const prefix = document.getElementById('prefixInput');
                if (prefix) prefix.value = currentConfig.prefix;
            }
            break;
    }
}

// Guardar configuración de un módulo
async function saveModuleConfig(moduleId) {
    if (!currentGuild) {
        showNotification('❌ No hay servidor seleccionado', 'error');
        return;
    }

    // Obtener configuración actual o crear nueva
    const config = currentConfig || {};

    // Actualizar según el módulo
    switch(moduleId) {
        case 'welcome':
            config.welcome = {
            enabled: document.getElementById('welcomeEnabled')?.checked || false,
                channel: document.getElementById('welcomeChannel')?.value || null,
                message: document.getElementById('welcomeMessage')?.value || 'Bienvenido {user} al servidor!'
            };
            break;
        case 'farewell':
            config.farewell = {
                enabled: document.getElementById('farewellEnabled')?.checked || false,
                channel: document.getElementById('farewellChannel')?.value || null,
                message: document.getElementById('farewellMessage')?.value || '{user} nos ha abandonado :('
            };
            break;
        case 'invite-tracker':
            config.inviteTracker = {
                enabled: document.getElementById('inviteTrackerEnabled')?.checked !== false
            };
            break;
        case 'automod':
            config.automod = {
                enabled: true,
                wordFilter: document.getElementById('automodWordFilter')?.checked || false,
                antiSpam: document.getElementById('automodAntiSpam')?.checked !== false,
                antiRaid: document.getElementById('automodAntiRaid')?.checked !== false
            };
            break;
        case 'logs':
            config.logs = {
                channel: document.getElementById('logsChannel')?.value || null
            };
            break;
        case 'infractions':
            config.infractions = {
                enabled: document.getElementById('infractionsEnabled')?.checked !== false
            };
            break;
        case 'music':
            config.music = {
                enabled: document.getElementById('musicEnabled')?.checked !== false
            };
            break;
        case 'general':
            config.prefix = document.getElementById('prefixInput')?.value || '!';
            break;
    }

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
            currentConfig = config;
            showNotification('✅ Configuración guardada correctamente', 'success');
        } else {
            showNotification('❌ Error al guardar: ' + (data.error || 'Error desconocido'), 'error');
        }

    } catch (error) {
        console.error('Error saving config:', error);
        showNotification('❌ Error al guardar la configuración', 'error');
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#5865f2' : '#f04747'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        }, 300);
    }, 3000);
}

function logout() {
    document.cookie = 'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    localStorage.removeItem('discord_token');
    localStorage.removeItem('discord_user');
    currentToken = null;
    currentGuild = null;
    currentConfig = null;
    window.location.href = './login.html';
}
