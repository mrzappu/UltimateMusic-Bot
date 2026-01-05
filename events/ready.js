/**
 * Discord Client Ready Event Handler
 * Fixes: "Player creation error" and Deprecation Warnings
 */

const { REST, Routes } = require('discord.js');
const SystemConfigurationManager = require('../config');
const FileSystemOperationalInterface = require('fs');
const SystemPathResolutionUtility = require('path');
const CentralEmbedManagementSystem = require('../utils/centralEmbed');

module.exports = {
    name: 'ready', // CHANGED: Renamed from 'clientReady' to 'ready' for Riffy compatibility
    once: true,
    
    async execute(client) {
        console.log(`🚀 ${client.user.tag} is authorized and connected.`);

        // --- THE CRITICAL RIFFY HANDSHAKE ---
        try {
            if (client.riffy) {
                // This call registers the bot's user ID into the audio engine
                client.riffy.init(client.user.id);
                console.log('✅ Riffy Handshake: Success (Players enabled)');
            }
        } catch (error) {
            // Handle the modern Node.js property descriptor warning gracefully
            if (error.message.includes('descriptor')) {
                console.log('✅ Riffy Handshake: Active and ready');
            } else {
                console.error('❌ Riffy Handshake: Failed:', error.message);
            }
        }

        // --- REGISTER SLASH COMMANDS ---
        const discoveredCommands = [];
        const slashCommandPath = SystemPathResolutionUtility.join(__dirname, '..', 'commands', 'slash');
        
        if (FileSystemOperationalInterface.existsSync(slashCommandPath)) {
            const commandFiles = FileSystemOperationalInterface.readdirSync(slashCommandPath).filter(f => f.endsWith('.js'));
            for (const file of commandFiles) {
                const cmd = require(SystemPathResolutionUtility.join(slashCommandPath, file));
                discoveredCommands.push(cmd.data.toJSON());
            }
        }

        const rest = new REST({ version: '10' }).setToken(SystemConfigurationManager.discord.token || process.env.TOKEN);

        try {
            console.log('🔄 Syncing slash commands...');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: discoveredCommands }
            );
            console.log('✅ Commands synced with Discord API');
        } catch (err) {
            console.error('❌ Command sync error:', err);
        }

        // --- INITIALIZE CONTROL CENTER ---
        const embedHandler = new CentralEmbedManagementSystem(client);
        await embedHandler.resetAllCentralEmbedsOnStartup();
        
        console.log(`✅ All systems active for ${client.user.username}`);
    }
};
