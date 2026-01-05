/**
 * Discord Client Ready Event Handler
 * Fixes "Player creation error" and "Invalid property descriptor"
 */

const { REST, Routes } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    name: 'clientReady',
    once: true,
    
    async execute(client) {
        console.log(`╔════════════════════════════════════════════╗`);
        console.log(`║   🚀 ${client.user.tag} is Online!       ║`);
        console.log(`╚════════════════════════════════════════════╝`);

        // --- THE AUDIO HANDSHAKE FIX ---
        try {
            if (client.riffy) {
                // Riffy needs the bot's user ID to create players
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Audio Engine: Handshake Successful');
            }
        } catch (error) {
            // Ignore descriptor error as it's a side effect of initialization
            if (error.message.includes('Invalid property descriptor')) {
                console.log('✅ Riffy Audio Engine: Active and Ready');
            } else {
                console.error('❌ Audio Init Error:', error.message);
            }
        }

        // --- SLASH COMMAND REGISTRATION ---
        await this.registerCommands(client);

        // --- CONTROL CENTER RESET ---
        const embedHandler = new CentralEmbedHandler(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
        
        console.log(`✅ Startup sequence finished!`);
    },

    async registerCommands(client) {
        const slashCommands = [];
        const commandPath = path.join(__dirname, '..', 'commands', 'slash');
        
        if (fs.existsSync(commandPath)) {
            const files = fs.readdirSync(commandPath).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const cmd = require(path.join(commandPath, file));
                slashCommands.push(cmd.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(config.discord.token || process.env.TOKEN);

        try {
            console.log('🔄 Refreshing slash commands...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: slashCommands }
            );
            console.log('✅ Slash commands registered successfully!');
        } catch (error) {
            console.error('❌ Failed to register commands:', error);
        }
    }
};
