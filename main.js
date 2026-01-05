/**
 * Ultimate Music Bot 
 * Comprehensive Discord Bot
 * @fileoverview Core application
 * @version 1.0.0
 * @author GlaceYT
 */

const DiscordClientFramework = require('discord.js').Client;
const DiscordGatewayIntentBitsRegistry = require('discord.js').GatewayIntentBits;
const DiscordCollectionFramework = require('discord.js').Collection;
const RiffyAudioProcessingFramework = require('riffy').Riffy;
const FileSystemOperationalInterface = require('fs');
const SystemPathResolutionUtility = require('path');
const SystemConfigurationManager = require('./config');
const DatabaseConnectionEstablishmentService = require('./database/connection');
const AudioPlayerManagementHandler = require('./utils/player');
const ApplicationStatusManagementService = require('./utils/statusManager');
const MemoryGarbageCollectionOptimizer = require('./utils/garbageCollector');
const EnvironmentVariableConfigurationLoader = require('dotenv');
const shiva = require('./shiva');

// Initialize environment variable configuration subsystem
EnvironmentVariableConfigurationLoader.config();

/**
 * Discord Client Runtime Management System
 */
class DiscordClientRuntimeManager {
    constructor() {
        this.initializeClientConfiguration();
        this.initializeRuntimeSubsystems();
        this.initializeAudioProcessingInfrastructure();
        this.initializeApplicationBootstrapProcedures();
    }
    
    initializeClientConfiguration() {
        this.clientRuntimeInstance = new DiscordClientFramework({
            intents: [
                DiscordGatewayIntentBitsRegistry.Guilds,
                DiscordGatewayIntentBitsRegistry.GuildMessages,
                DiscordGatewayIntentBitsRegistry.GuildVoiceStates,
                DiscordGatewayIntentBitsRegistry.GuildMessageReactions,
                DiscordGatewayIntentBitsRegistry.MessageContent,
                DiscordGatewayIntentBitsRegistry.DirectMessages,
                DiscordGatewayIntentBitsRegistry.GuildPresences
            ]
        });
        
        this.clientRuntimeInstance.commands = new DiscordCollectionFramework();
        this.clientRuntimeInstance.slashCommands = new DiscordCollectionFramework();
        this.clientRuntimeInstance.mentionCommands = new DiscordCollectionFramework();
    }
    
    initializeRuntimeSubsystems() {
        this.statusManagementSubsystem = new ApplicationStatusManagementService(this.clientRuntimeInstance);
        this.clientRuntimeInstance.statusManager = this.statusManagementSubsystem;
        
        this.audioPlayerManagementSubsystem = new AudioPlayerManagementHandler(this.clientRuntimeInstance);
        this.clientRuntimeInstance.playerHandler = this.audioPlayerManagementSubsystem;
    }
    
    initializeAudioProcessingInfrastructure() {
        const audioNodeConfigurationRegistry = this.constructAudioNodeConfiguration();
        
        this.audioProcessingRuntimeInstance = new RiffyAudioProcessingFramework(
            this.clientRuntimeInstance, 
            audioNodeConfigurationRegistry, 
            {
                send: (audioPayloadTransmissionData) => {
                    const guildContextResolution = this.clientRuntimeInstance.guilds.cache
                        .get(audioPayloadTransmissionData.d.guild_id);
                    if (guildContextResolution) {
                        guildContextResolution.shard.send(audioPayloadTransmissionData);
                    }
                },
                defaultSearchPlatform: "ytmsearch",
                restVersion: "v4"
            }
        );
        
        this.clientRuntimeInstance.riffy = this.audioProcessingRuntimeInstance;
    }
    
    /**
     * FIXED: Added explicit 'name' property and forced Integer for port.
     * This prevents the "Invalid property descriptor" error in Node 20/22.
     */
    constructAudioNodeConfiguration() {
        const config = SystemConfigurationManager;
        return [
            {
                name: "Main-Lavalink-Node", 
                host: config.lavalink.host,
                password: config.lavalink.password,
                port: parseInt(config.lavalink.port),
                secure: config.lavalink.secure === true || config.lavalink.secure === "true"
            }
        ];
    }
    
    initializeApplicationBootstrapProcedures() {
        this.applicationBootstrapOrchestrator = new ApplicationBootstrapOrchestrator(
            this.clientRuntimeInstance
        );
    }
    
    async executeApplicationBootstrap() {
        try {
            await this.applicationBootstrapOrchestrator.executeDatabaseConnectionEstablishment();
            await this.applicationBootstrapOrchestrator.executeCommandDiscoveryAndRegistration();
            await this.applicationBootstrapOrchestrator.executeEventHandlerRegistration();
            await this.applicationBootstrapOrchestrator.executeMemoryOptimizationInitialization();
            await this.applicationBootstrapOrchestrator.executeAudioSubsystemInitialization();
            await this.applicationBootstrapOrchestrator.executeClientAuthenticationProcedure();
        } catch (error) {
            console.error('❌ Critical Startup Error:', error);
            process.exit(1);
        }
    }
}

class ApplicationBootstrapOrchestrator {
    constructor(clientRuntimeInstance) {
        this.clientRuntimeInstance = clientRuntimeInstance;
        this.commandDiscoveryEngine = new CommandDiscoveryEngine();
    }
    
    async executeDatabaseConnectionEstablishment() {
        await DatabaseConnectionEstablishmentService();
        console.log('✅ MongoDB connected successfully');
    }
    
    async executeCommandDiscoveryAndRegistration() {
        const discovery = this.commandDiscoveryEngine;
        discovery.executeMessageCommandDiscovery(this.clientRuntimeInstance);
        discovery.executeSlashCommandDiscovery(this.clientRuntimeInstance);
        console.log(`✅ Commands Loaded Successfully`);
    }
    
    async executeEventHandlerRegistration() {
        const service = new EventHandlerRegistrationService();
        service.executeEventDiscovery().bindEventHandlers(this.clientRuntimeInstance);
        console.log(`✅ Events Loaded Successfully`);
    }
    
    async executeMemoryOptimizationInitialization() {
        MemoryGarbageCollectionOptimizer.init();
    }
    
    async executeAudioSubsystemInitialization() {
        this.clientRuntimeInstance.playerHandler.initializeEvents();
        new AudioSubsystemIntegrationManager(this.clientRuntimeInstance);
    }
    
    async executeClientAuthenticationProcedure() {
        const token = SystemConfigurationManager.discord.token || process.env.TOKEN;
        await this.clientRuntimeInstance.login(token);
    }
}

class CommandDiscoveryEngine {
    executeMessageCommandDiscovery(clientInstance) {
        const dir = SystemPathResolutionUtility.join(__dirname, 'commands', 'message');
        if (FileSystemOperationalInterface.existsSync(dir)) {
            FileSystemOperationalInterface.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(file => {
                const cmd = require(SystemPathResolutionUtility.join(dir, file));
                clientInstance.commands.set(cmd.name, cmd);
            });
        }
        return this;
    }
    
    executeSlashCommandDiscovery(clientInstance) {
        const dir = SystemPathResolutionUtility.join(__dirname, 'commands', 'slash');
        if (FileSystemOperationalInterface.existsSync(dir)) {
            FileSystemOperationalInterface.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(file => {
                const cmd = require(SystemPathResolutionUtility.join(dir, file));
                clientInstance.slashCommands.set(cmd.data.name, cmd);
            });
        }
    }
}

class EventHandlerRegistrationService {
    executeEventDiscovery() {
        const dir = SystemPathResolutionUtility.join(__dirname, 'events');
        this.events = FileSystemOperationalInterface.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => require(SystemPathResolutionUtility.join(dir, f)));
        return this;
    }
    
    bindEventHandlers(clientInstance) {
        this.events.forEach(e => {
            if (e.once) clientInstance.once(e.name, (...args) => e.execute(...args, clientInstance));
            else clientInstance.on(e.name, (...args) => e.execute(...args, clientInstance));
        });
    }
}

class AudioSubsystemIntegrationManager {
    constructor(clientInstance) {
        this.clientInstance = clientInstance;
        clientInstance.on('raw', (p) => {
            if (['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(p.t)) {
                clientInstance.riffy.updateVoiceState(p);
            }
        });
        
        clientInstance.riffy.on('nodeConnect', (n) => console.log(`🎵 Lavalink node "${n.name}" connected`));
        clientInstance.riffy.on('nodeError', (n, err) => console.error(`🔴 Lavalink node "${n.name}" error:`, err.message));
    }
}

const manager = new DiscordClientRuntimeManager();
manager.executeApplicationBootstrap();

shiva.initialize(manager.clientRuntimeInstance);
module.exports = manager.clientRuntimeInstance;
