/**
 * Discord Client Ready Event Handler
 * * @fileoverview 
 * @version 1.0.1
 * @author Rick, Adhidhi
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
     * FIXED: Added error handling for double-initialization to prevent crash
     */
    async initializeAudioProcessingSubsystem() {
        try {
            if (this.clientRuntimeInstance.riffy) {
                this.clientRuntimeInstance.riffy.init(this.clientRuntimeInstance.user.id);
                this.initializationStatus.audioSystemReady = true;
            }
        } catch (audioInitializationException) {
            if (audioInitializationException.message.includes('Invalid property descriptor')) {
                // Ignore descriptor error if already initialized
                this.initializationStatus.audioSystemReady = true;
            } else {
                console.error('❌ Audio system initialization failed:', audioInitializationException);
                throw audioInitializationException;
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
        } catch (embedSystemException) {
            console.error('❌ Embed system initialization failed:', embedSystemException);
            this.initializationStatus.embedSystemReady = false;
        }
    }
    
    async activateStatusManagementSystem() {
        try {
            await this.clientRuntimeInstance.statusManager.setServerCountStatus(
                this.clientRuntimeInstance.guilds.cache.size
            );
            this.initializationStatus.statusSystemReady = true;
        } catch (statusSystemException) {
            console.error('❌ Status system initialization failed:', statusSystemException);
            this.initializationStatus.statusSystemReady = false;
        }
    }
    
    validateStartupSequenceCompletion() {
        const initializationDuration = Date.now() - this.startupTimestamp;
        const criticalSystemsOnline = this.initializationStatus.audioSystemReady && 
                                     this.initializationStatus.commandsRegistered;
        
        if (criticalSystemsOnline) {
            console.log(`✅ Bot initialization completed successfully in ${initializationDuration}ms`);
        } else {
            console.warn('⚠️ Bot started with some subsystem failures');
        }
    }
    
    handleInitializationFailure(initializationException) {
        console.error('💥 Critical initialization failure:', initializationException);
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
            return {
                success: this.registrationSuccess,
                commandCount: this.discoveredCommands.length
            };
        } catch (registrationException) {
            console.error('❌ Command registration failed:', registrationException);
            return { success: false, commandCount: 0, error: registrationException.message };
        }
    }

    async executeCommandDiscoveryProcedures() {
        const slashCommandDirectoryPath = SystemPathResolutionUtility.join(__dirname, '..', 'commands', 'slash');
        if (FileSystemOperationalInterface.existsSync(slashCommandDirectoryPath)) {
            const discoveredCommandFiles = FileSystemOperationalInterface
                .readdirSync(slashCommandDirectoryPath)
                .filter(fileEntity => fileEntity.endsWith('.js'));
            
            for (const commandFile of discoveredCommandFiles) {
                const commandModuleInstance = require(SystemPathResolutionUtility.join(slashCommandDirectoryPath, commandFile));
                this.discoveredCommands.push(commandModuleInstance.data.toJSON());
            }
        }
    }
    
    async executeDiscordAPIRegistration() {
        const discordRESTClient = new DiscordRESTClientManager()
            .setToken(SystemConfigurationManager.discord.token || process.env.TOKEN);
        
        console.log('🔄 Started refreshing slash commands...');
        await discordRESTClient.put(
            DiscordApplicationRoutesRegistry.applicationCommands(this.clientRuntimeInstance.user.id),
            { body: this.discoveredCommands }
        );
        this.registrationSuccess = true;
        console.log('✅ Successfully registered slash commands!');
    }
}

