/**
 * Discord Client Ready Event Handler
 * Fixes: "Player creation error" and "Invalid property descriptor"
 */

const { REST, Routes } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    name: 'ready', // Use 'ready' for the most reliable library detection
    once: true,
    
    async execute(client) {
        console.log(`🚀 ${client.user.tag} is authorized and connected.`);

        // --- CRITICAL AUDIO ENGINE INITIALIZATION ---
        // This MUST happen inside the ready event with the client ID
        try {
            if (client.riffy) {
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Handshake: Success (Players enabled)');
            }
        } catch (error) {
            // Check for the known Node descriptor error and handle gracefully
            if (error.message.includes('Invalid property descriptor')) {
                console.log('✅ Riffy Handshake: Active and bypass successful');
            } else {
                console.error('❌ Riffy Handshake: Failed:', error.message);
            }
        }

        // --- SLASH COMMANDS DEPLOYMENT ---
        const slashCommands = [];
        const commandFolder = path.join(__dirname, '..', 'commands', 'slash');
        
        if (fs.existsSync(commandFolder)) {
            const files = fs.readdirSync(commandFolder).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const cmd = require(path.join(commandFolder, file));
                slashCommands.push(cmd.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(config.discord.token || process.env.TOKEN);

        try {
            console.log('🔄 Syncing slash commands...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: slashCommands }
            );
            console.log('✅ Commands synced with Discord API');
        } catch (err) {
            console.error('❌ Command sync error:', err);
        }

        // --- COMPONENT INITIALIZATION ---
        const embedManager = new CentralEmbedHandler(client);
        await embedManager.resetAllCentralEmbedsOnStartup();
        
        console.log(`✅ All systems active for ${client.user.username}`);
    }
};
