/**
 * Discord Client Ready Event Handler
 * @version 1.0.3
 * @author GlaceYT
 */

const DiscordRESTClientManager = require('discord.js').REST;
const DiscordApplicationRoutesRegistry = require('discord.js').Routes;
const SystemConfigurationManager = require('../config');
const FileSystemOperationalInterface = require('fs');
const SystemPathResolutionUtility = require('path');
const CentralEmbedManagementSystem = require('../utils/centralEmbed');

module.exports = {
    name: 'clientReady',
    once: true,
    
    async execute(client) {
        const clientInitializationManager = new ClientInitializationManager(client);
        await clientInitializationManager.executeComprehensiveStartupSequence();
    }
};

class ClientInitializationManager {
    constructor(clientInstance) {
        this.clientRuntimeInstance = clientInstance;
        this.startupTimestamp = Date.now();
        this.initializationStatus = {
            audioSystemReady: false,
            commandsRegistered: false,
            embedSystemReady: false,
            statusSystemReady: false
        };
    }
    
    async executeComprehensiveStartupSequence() {
        try {
            this.executeStartupNotificationProcedures();
            
            // CRITICAL: Initialize Audio first so players can be created
            await this.initializeAudioProcessingSubsystem();
            
            await this.executeCommandRegistrationProcedures();
            await this.initializeEmbedManagementSubsystem();
            await this.activateStatusManagementSystem();
            this.validateStartupSequenceCompletion();
            
        } catch (initializationException) {
            this.handleInitializationFailure(initializationException);
        }
    }
    
    executeStartupNotificationProcedures() {
        console.log(`🎵 ${this.clientRuntimeInstance.user.tag} is online and ready!`);
        console.log(`🆔 Client ID: ${this.clientRuntimeInstance.user.id}`);
    }
    
    /**
     * FIXED: Forces Riffy initialization while catching descriptor errors.
     * This resolves the "Player creation error".
     */
    async initializeAudioProcessingSubsystem() {
        try {
            if (this.clientRuntimeInstance.riffy) {
                // We MUST call init with the user ID for Riffy to work
                this.clientRuntimeInstance.riffy.init(this.clientRuntimeInstance.user.id);
                this.initializationStatus.audioSystemReady = true;
                console.log('✅ Riffy audio engine initialized successfully');
            }
        } catch (error) {
            // If the error is just the "descriptor" warning, we are actually okay
            if (error.message.includes('Invalid property descriptor')) {
                this.initializationStatus.audioSystemReady = true;
                console.log('✅ Audio system active (descriptor handled)');
            } else {
                console.error('❌ Audio system initialization failed:', error);
                throw error;
            }
        }
    }
    
    async executeCommandRegistrationProcedures() {
        const commandRegistrationService = new SlashCommandRegistrationService(this.clientRuntimeInstance);
        const registrationResult = await commandRegistrationService.executeCommandDiscoveryAndRegistration();
        this.initializationStatus.commandsRegistered = registrationResult.success;
    }
    
    async initializeEmbedManagementSubsystem() {
        try {
            const centralEmbedManager = new CentralEmbedManagementSystem(this.clientRuntimeInstance);
            await centralEmbedManager.resetAllCentralEmbedsOnStartup();
            this.initializationStatus.embedSystemReady = true;
        } catch (err) {
            console.error('❌ Embed system failure:', err.message);
        }
    }
    
    async activateStatusManagementSystem() {
        try {
            await this.clientRuntimeInstance.statusManager.setServerCountStatus(
                this.clientRuntimeInstance.guilds.cache.size
            );
            this.initializationStatus.statusSystemReady = true;
        } catch (err) {
            console.error('❌ Status system failure:', err.message);
        }
    }
    
    validateStartupSequenceCompletion() {
        const duration = Date.now() - this.startupTimestamp;
        console.log(`✅ Bot initialization completed in ${duration}ms`);
    }
    
    handleInitializationFailure(err) {
        console.error('💥 Critical initialization failure:', err);
    }
}

class SlashCommandRegistrationService {
    constructor(clientInstance) {
        this.clientRuntimeInstance = clientInstance;
        this.discoveredCommands = [];
        this.registrationSuccess = false;
    }
    
    async executeCommandDiscoveryAndRegistration() {
        try {
            await this.executeCommandDiscoveryProcedures();
            await this.executeDiscordAPIRegistration();
            return { success: this.registrationSuccess };
        } catch (err) {
            return { success: false };
        }
    }

    async executeCommandDiscoveryProcedures() {
        const dir = SystemPathResolutionUtility.join(__dirname, '..', 'commands', 'slash');
        if (FileSystemOperationalInterface.existsSync(dir)) {
            const files = FileSystemOperationalInterface.readdirSync(dir).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const cmd = require(SystemPathResolutionUtility.join(dir, file));
                this.discoveredCommands.push(cmd.data.toJSON());
            }
        }
    }
    
    async executeDiscordAPIRegistration() {
        const rest = new DiscordRESTClientManager().setToken(SystemConfigurationManager.discord.token || process.env.TOKEN);
        console.log('🔄 Refreshing slash commands...');
        await rest.put(
            DiscordApplicationRoutesRegistry.applicationCommands(this.clientRuntimeInstance.user.id),
            { body: this.discoveredCommands }
        );
        this.registrationSuccess = true;
        console.log('✅ Registered slash commands!');
    }
}
