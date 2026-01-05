const { REST, Routes, Events } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    // Using Events.ClientReady (clientReady) is standard for v14+
    name: Events.ClientReady, 
    once: true,
    
    async execute(client) {
        // --- THE FINAL FIX ---
        // We MUST initialize Riffy immediately here.
        if (client.riffy) {
            try {
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Handshake: Success');
            } catch (error) {
                // Ignore descriptor errors
                if (!error.message.includes('descriptor')) {
                    console.error('❌ Riffy Handshake Error:', error);
                }
            }
        }

        console.log(`🚀 ${client.user.tag} is online and authorized.`);

        // --- SLASH COMMANDS ---
        const rest = new REST({ version: '10' }).setToken(config.discord.token || process.env.TOKEN);
        const commands = [];
        const cmdPath = path.join(__dirname, '..', 'commands', 'slash');
        
        if (fs.existsSync(cmdPath)) {
            fs.readdirSync(cmdPath).forEach(f => {
                const cmd = require(path.join(cmdPath, f));
                commands.push(cmd.data.toJSON());
            });
        }

        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log('✅ Commands Synced');
        } catch (err) { console.error(err); }

        // --- EMBED SYSTEM ---
        const embedHandler = new CentralEmbedHandler(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
    }
};
