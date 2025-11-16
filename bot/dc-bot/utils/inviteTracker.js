const fs = require('fs').promises;
const path = require('path');

class InviteTracker {
  constructor() {
    this.invites = new Map(); // guildId -> Map(code -> uses)
  }

  async init(client) {
    this.client = client;
    for (const guild of client.guilds.cache.values()) {
      await this.loadGuildInvites(guild).catch(() => {});
    }

    // Update invites on create/delete
    client.on('inviteCreate', invite => this.loadGuildInvites(invite.guild).catch(() => {}));
    client.on('inviteDelete', invite => this.loadGuildInvites(invite.guild).catch(() => {}));
  }

  async loadGuildInvites(guild) {
    try {
      // require MANAGE_GUILD permission to fetch invites
      const invites = await guild.invites.fetch();
      const map = new Map();
      for (const inv of invites.values()) map.set(inv.code, inv.uses || 0);
      this.invites.set(guild.id, map);
    } catch (err) {
      // ignore if bot lacks permission
      // console.warn(`Could not fetch invites for ${guild.id}:`, err.message);
    }
  }

  async detectInviteUsed(guild) {
    try {
      const before = this.invites.get(guild.id) || new Map();
      const invites = await guild.invites.fetch();
      let used = null;
      for (const inv of invites.values()) {
        const prev = before.get(inv.code) || 0;
        const now = inv.uses || 0;
        if (now > prev) {
          used = inv; break;
        }
      }

      // refresh cache
      const map = new Map();
      for (const inv of invites.values()) map.set(inv.code, inv.uses || 0);
      this.invites.set(guild.id, map);

      return used; // may be null
    } catch (err) {
      return null;
    }
  }
}

module.exports = new InviteTracker();
