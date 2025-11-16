const fs = require('fs').promises;
const path = require('path');

const MENUS_FILE = path.join(__dirname, '..', 'data', 'menus.json');
const PANELS_FILE = path.join(__dirname, '..', 'data', 'panels.json');

class MenuManager {
    static async loadMenus() {
        try {
            const data = await fs.readFile(MENUS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    static async saveMenus(menus) {
        await fs.writeFile(MENUS_FILE, JSON.stringify(menus, null, 2));
    }

    static async loadPanels() {
        try {
            const data = await fs.readFile(PANELS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    static async savePanels(panels) {
        await fs.writeFile(PANELS_FILE, JSON.stringify(panels, null, 2));
    }

    static async createMenu(guildId, embedName, menuId, buttonText) {
        const menus = await this.loadMenus();
        
        if (!menus[guildId]) menus[guildId] = {};
        
        // Verificar si el menuId ya existe
        if (menus[guildId][menuId]) {
            throw new Error('Ya existe un menú con ese identificador');
        }

        menus[guildId][menuId] = {
            embedName,
            buttonText,
            options: [],
            createdAt: Date.now()
        };

        await this.saveMenus(menus);
        return menus[guildId][menuId];
    }

    static async addMenuOption(guildId, menuId, panel, optionName, optionDescription) {
        const menus = await this.loadMenus();
        
        if (!menus[guildId]?.[menuId]) {
            throw new Error('No se encontró el menú especificado');
        }

        const menu = menus[guildId][menuId];
        
        // Verificar si ya existe una opción con el mismo nombre
        if (menu.options.some(opt => opt.label === optionName)) {
            throw new Error('Ya existe una opción con ese nombre en el menú');
        }

        menu.options.push({
            label: optionName,
            description: optionDescription,
            value: `${menuId}-${panel}-${menu.options.length}`,
            panel
        });

        await this.saveMenus(menus);
        return menu;
    }

    static async createPanel(guildId, panelName) {
        const panels = await this.loadPanels();
        
        if (!panels[guildId]) panels[guildId] = {};
        
        if (panels[guildId][panelName]) {
            throw new Error('Ya existe un panel con ese nombre');
        }

        panels[guildId][panelName] = {
            name: panelName,
            createdAt: Date.now()
        };

        await this.savePanels(panels);
        return panels[guildId][panelName];
    }

    static async getMenusForGuild(guildId) {
        const menus = await this.loadMenus();
        return menus[guildId] || {};
    }

    static async getPanelsForGuild(guildId) {
        const panels = await this.loadPanels();
        return panels[guildId] || {};
    }
}

module.exports = MenuManager;