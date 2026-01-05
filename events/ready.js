const { REST, Routes, Events } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const CentralEmbedHandler = require('../utils/centralEmbed');

module.exports = {
    name: Events.ClientReady, 
    once: true,
    
    async execute(client) {
        // --- THE ONLY FIX: IMMEDIATE SYNCHRONOUS INIT ---
        if (client.riffy) {
            try {
                // Riffy must have the bot's ID before it allows player creation
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Handshake: SUCCESS');
            } catch (error) {
                // Bypass common Node 20+ property descriptor warnings
                if (!error.message.includes('descriptor')) {
                    console.error('❌ Riffy Handshake Error:', error);
                } else {
                    console.log('✅ Riffy Handshake: ACTIVE (Bypassed Descriptor)');
                }
            }
        }

        console.log(`🚀 ${client.user.tag} is online and authorized.`);

        // --- COMMAND REGISTRATION ---
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
        } catch (err) { console.error('❌ Command Sync Error:', err); }

        // --- EMBED SYSTEM ---
        const embedHandler = new CentralEmbedHandler(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
    }
};
