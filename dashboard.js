function openInviteLink(guildId) {
    const base = 'https://discord.com/api/oauth2/authorize';
    const clientId = '1200476680280608958';
    const guildParam = guildId || document.getElementById('invite-modal')?.dataset?.guildId;
    let inviteUrl = `${base}?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    if (guildParam) {
        inviteUrl += `&guild_id=${guildParam}&disable_guild_select=true`;
    }

    // Abrir la invitación en una nueva pestaña/ventana
    const popup = window.open(inviteUrl, '_blank');
    closeInviteModal();

    // Si no hay guildId, solo mostramos notificación y salimos
    if (!guildParam) {
        showNotification('✅ Abre la nueva pestaña y autoriza el bot. Luego vuelve aquí y recarga la página.', 'success');
        return;
    }

    showNotification('🔎 Esperando a que agregues el bot... (detectaré cuando esté en el servidor)', 'success');

    // Hacer polling a /api/guild-config para detectar si el bot fue agregado al guild
    const POLL_INTERVAL = 5000; // 5s
    const TIMEOUT = 120000; // 2min
    const start = Date.now();

    const poll = async () => {
        try {
            const resp = await fetch(`/api/guild-config?guildId=${guildParam}&token=${encodeURIComponent(currentToken)}`);
            const body = await resp.json().catch(() => ({}));

            // Si la respuesta indica que el bot está en el servidor -> actualizar UI y parar
            if ((resp.ok && body.success && body.botInGuild !== false) || body.botInGuild === true) {
                updateGuildPresence(guildParam, true);
                showNotification('✅ Bot detectado en el servidor. Ahora puedes configurar.', 'success');
                return true;
            }
            // Si la respuesta explícitamente indica que no está
            if (!resp.ok || body.botInGuild === false) {
                // seguir esperando hasta timeout
                return false;
            }
        } catch (err) {
            // ignorar errores y continuar intentos
            console.error('Polling guild-config error:', err);
        }
        return false;
    };

    let stopped = false;

    const intervalId = setInterval(async () => {
        // Si popup fue cerrado por el usuario, haremos un último intento y luego paramos
        if (popup && popup.closed) {
            // do one last immediate check
            const ok = await poll();
            clearInterval(intervalId);
            stopped = true;
            if (!ok) {
                showNotification('⏳ Ventana cerrada. Si invitaste al bot, recarga la página o espera un momento.', 'success');
            }
            return;
        }

        // timeout
        if (Date.now() - start > TIMEOUT) {
            clearInterval(intervalId);
            stopped = true;
            showNotification('⏱️ Tiempo de espera agotado. Si invitaste al bot, recarga la página o intenta comprobar manualmente.', 'error');
            return;
        }

        const added = await poll();
        if (added) {
            clearInterval(intervalId);
            stopped = true;
        }
    }, POLL_INTERVAL);

    // Por si acaso, también parcheamos para limpiar si el usuario navega fuera
    window.addEventListener('beforeunload', () => {
        if (!stopped) clearInterval(intervalId);
    });
}


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

// Comprobar en background servidores con estado desconocido y actualizar la UI
async function checkUnknownGuilds(guilds) {
    if (!guilds || !guilds.length) return;

    // Filtrar los que tienen botInGuild === null
    const unknown = guilds.filter(g => g.botInGuild === null);
    if (!unknown.length) return;

    // Limitar concurrencia para no golpear la API de Discord
    const CONCURRENCY = 5;
    let index = 0;

    async function worker() {
        while (index < unknown.length) {
            const i = index++;
            const g = unknown[i];
            try {
                const resp = await fetch(`/api/guild-config?guildId=${g.id}&token=${encodeURIComponent(currentToken)}`);
                const body = await resp.json().catch(() => ({}));
                // Determinar presencia del bot según la respuesta
                if (!resp.ok || body.botInGuild === false || body.error === 'Bot not in server') {
                    updateGuildPresence(g.id, false);
                } else {
                    updateGuildPresence(g.id, true);
                }
            } catch (err) {
                console.error('Error checking guild-config for', g.id, err);
                // En caso de fallo, no cambiar nada (permanece unknown)
            }
            // Pequeña espera para espaciar peticiones
            await new Promise(r => setTimeout(r, 200));
        }
    }

    // Lanzar varios workers
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) workers.push(worker());
    await Promise.all(workers);
}

// Actualizar la propiedad botInGuild en memoria y actualizar la tarjeta en la UI
function updateGuildPresence(guildId, present) {
    const gIdx = allGuilds.findIndex(g => g.id === guildId);
    if (gIdx !== -1) {
        allGuilds[gIdx].botInGuild = present;
    }

    // Actualizar el DOM: buscar la tarjeta correspondiente y cambiar el badge
    const serversGrid = document.getElementById('servers-grid');
    if (!serversGrid) return;

    // Encontrar el server-card que contiene la server-id igual a guildId
    const cards = Array.from(serversGrid.querySelectorAll('.server-card'));
    for (const card of cards) {
        const idEl = card.querySelector('.server-id');
        if (!idEl) continue;
        if (idEl.textContent === guildId) {
            const nameEl = card.querySelector('.server-name');
            if (!nameEl) break;
            // Remover badge si existe
            const existing = nameEl.querySelector('.bot-badge');
            if (existing) existing.remove();
            // Crear nuevo badge
            const span = document.createElement('span');
            span.classList.add('bot-badge');
            span.title = present ? 'Bot presente' : 'Bot no presente';
            span.classList.add(present ? 'bot-present' : 'bot-absent');
            // Insertar antes de la crown icon
            const crown = nameEl.querySelector('.server-crown');
            if (crown) nameEl.insertBefore(span, crown);
            break;
        }
    }
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
        console.log('[dashboard] loadGuilds start, token present?', !!currentToken);
        const response = await fetch(`/api/guilds?token=${encodeURIComponent(currentToken)}`);
        const data = await response.json();
        console.log('[dashboard] /api/guilds response', response.status, data && (Array.isArray(data.guilds) ? data.guilds.length + ' guilds' : data.guilds));

        if (!response.ok || !data.success) {
            console.error('Error loading guilds:', data.error);
            document.getElementById('servers-grid').innerHTML = '<div class="loading"><p>Error al cargar servidores</p></div>';
            return;
        }

        if (!data.guilds || !Array.isArray(data.guilds)) {
            console.error('[dashboard] /api/guilds did not return guilds array', data);
            document.getElementById('servers-grid').innerHTML = '<div class="loading"><p>Error al cargar servidores (respuesta inválida)</p></div>';
            return;
        }

        allGuilds = data.guilds;
        displayServers(data.guilds);
        // Comprobar en background los guilds con estado desconocido (botInGuild === null)
        checkUnknownGuilds(data.guilds);

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

        // Determinar badge del bot: true = verde, false = rojo, null/undefined = gris (desconocido)
        let botBadge = '';
        if (guild.botInGuild === true) {
            botBadge = `<span class="bot-badge bot-present" title="Bot presente"></span>`;
        } else if (guild.botInGuild === false) {
            botBadge = `<span class="bot-badge bot-absent" title="Bot no presente"></span>`;
        } else {
            botBadge = `<span class="bot-badge bot-unknown" title="Estado del bot desconocido"></span>`;
        }

        // CTA button HTML based on bot presence
        let ctaHtml = '';
        if (guild.botInGuild === true) {
            ctaHtml = `<button class="card-cta cta-config" onclick="event.stopPropagation(); selectGuild('${guild.id}')">Configurar</button>`;
        } else if (guild.botInGuild === false) {
            ctaHtml = `<button class="card-cta cta-invite" onclick="event.stopPropagation(); openInviteLink('${guild.id}')">Invitar</button>`;
        } else {
            ctaHtml = `<button class="card-cta cta-invite" onclick="event.stopPropagation(); handleServerClick('${guild.id}')">Comprobar</button>`;
        }

        return `
            <div class="server-card" onclick="handleServerClick('${guild.id}')">
                <div class="server-icon">
                    ${iconDisplay}
                </div>
                <div class="server-info">
                    <div class="server-name">
                        ${guild.name}
                        ${botBadge}
                        <i class="fas fa-crown server-crown"></i>
                    </div>
                    <div class="server-id">${guild.id}</div>
                    <div style="margin-top:12px">${ctaHtml}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Manejar click en tarjeta de servidor: si el bot NO está en el servidor, abrir link de invitación;
// si el bot está, navegar a la configuración de ese servidor.
function handleServerClick(guildId) {
    const guild = allGuilds.find(g => g.id === guildId);
    // Por seguridad, si no encontramos el guild en memoria, intentamos cargar la configuración normalmente
    if (!guild) return selectGuild(guildId);

    // Si botInGuild es exactamente false => abrir invitación directa
    if (guild.botInGuild === false) {
        openInviteLink(guildId);
        return;
    }

    // Si el estado es desconocido (null), hacemos una comprobación rápida al endpoint de guild-config
    if (guild.botInGuild === null) {
        // Mostrar notificación de comprobación
        showNotification('Comprobando estado del bot en el servidor...', 'success');
        fetch(`/api/guild-config?guildId=${guildId}&token=${encodeURIComponent(currentToken)}`)
            .then(resp => resp.json().then(body => ({ ok: resp.ok, status: resp.status, body })))
            .then(result => {
                const data = result.body || {};
                // Si el endpoint indica que el bot no está
                if (!result.ok || data.botInGuild === false) {
                    openInviteLink(guildId);
                    return;
                }
                // Si el bot está o la respuesta es positiva, abrir la configuración
                selectGuild(guildId);
            })
            .catch(err => {
                console.error('Error comprobando guild-config:', err);
                // En caso de error, abrir modal de invitación como fallback
                openInviteLink(guildId);
            });
        return;
    }

    // Si botInGuild es true => intentar abrir la configuración
    return selectGuild(guildId);
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

        // Si el bot no está en el servidor
        if (!response.ok) {
            if (response.status === 404 || response.status === 403) {
                // Mostrar modal de invitación
                showInviteModal(guild);
                return;
            }
            showNotification('❌ Error al cargar la configuración del servidor', 'error');
            return;
        }

        // Verificar si el bot está en el servidor
        if (!data.success || data.botInGuild === false) {
            if (data.error === 'Bot not in server' || data.botInGuild === false) {
                // Mostrar modal de invitación
                showInviteModal(guild);
                return;
            }
            showNotification('❌ Error al cargar la configuración del servidor: ' + (data.error || 'Error desconocido'), 'error');
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
        // Actualizar link de invitación dentro del modal para invitar directamente al servidor seleccionado
        try {
            const inviteLinkEl = document.getElementById('invite-link');
            if (inviteLinkEl) {
                const base = 'https://discord.com/api/oauth2/authorize';
                const clientId = '1200476680280608958';
                const inviteUrl = `${base}?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}&disable_guild_select=true`;
                inviteLinkEl.textContent = inviteUrl;
            }
        } catch (e) {
            // ignore
        }
    }
}

// Cerrar modal de invitación
function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    if (modal) {
        modal.classList.remove('active');
    }
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
