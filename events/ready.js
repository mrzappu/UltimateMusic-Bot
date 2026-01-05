const { REST, Routes } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    name: 'ready', // MUST be 'ready' for Riffy to detect initialization
    once: true,
    
    async execute(client) {
        console.log(`🚀 ${client.user.tag} is authorized.`);

        // --- THE FIX: DIRECT HANDSHAKE ---
        try {
            if (client.riffy) {
                // We call init directly in the native ready event
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Handshake: SUCCESSful (Players Enabled)');
            }
        } catch (error) {
            // Silently handle the descriptor error if it's already active
            if (error.message.includes('descriptor')) {
                console.log('✅ Riffy Handshake: ACTIVE');
            }
        }

        // Register Slash Commands
        const commands = [];
        const cmdPath = path.join(__dirname, '..', 'commands', 'slash');
        if (fs.existsSync(cmdPath)) {
            fs.readdirSync(cmdPath).forEach(file => {
                const cmd = require(path.join(cmdPath, file));
                commands.push(cmd.data.toJSON());
            });
        }

        const rest = new REST({ version: '10' }).setToken(config.discord.token || process.env.TOKEN);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('✅ Commands Registered');
        } catch (err) { console.error('❌ Registration Error:', err); }

        // Refresh Control Center
        const embedHandler = new CentralEmbedHandler(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
    }
};
