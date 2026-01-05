/**
 * Discord Client Ready Event Handler
 * Fixes: "Player creation error"
 */

const { REST, Routes, Events } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    name: Events.ClientReady, // Uses the official Enum string 'clientReady'
    once: true,
    
    async execute(client) {
        console.log(`🚀 Authorized as ${client.user.tag}`);

        // --- MANDATORY HANDSHAKE ---
        // This MUST happen inside the ClientReady event.
        if (client.riffy) {
            try {
                // Initialize Riffy with the Bot's ID
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Audio Engine: Handshake Complete');
            } catch (error) {
                // Bypass the descriptor crash but log other errors
                if (!error.message.includes('descriptor')) {
                    console.error('❌ Riffy Handshake Failed:', error.message);
                }
            }
        }

        // Register Slash Commands
        await this.deployCommands(client);

        // Reset the Control Center
        const embedHandler = new CentralEmbedHandler(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
        
        console.log(`✅ All systems online.`);
    },

    async deployCommands(client) {
        const commands = [];
        const dir = path.join(__dirname, '..', 'commands', 'slash');
        
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const cmd = require(path.join(dir, file));
                commands.push(cmd.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(config.discord.token || process.env.TOKEN);

        try {
            console.log('🔄 Syncing slash commands...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            console.log('✅ Slash commands synced.');
        } catch (err) {
            console.error('❌ Command sync failure:', err);
        }
    }
};
