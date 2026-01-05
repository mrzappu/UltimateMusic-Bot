/**
 * Ultimate Music Bot - Core Application
 * @version 1.0.5
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Riffy } = require('riffy');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const DatabaseConnection = require('./database/connection');
const AudioPlayerHandler = require('./utils/player');
const StatusManager = require('./utils/statusManager');
const MemoryOptimizer = require('./utils/garbageCollector');
require('dotenv').config();
const shiva = require('./shiva');

class MusicBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
            ]
        });

        this.client.commands = new Collection();
        this.client.slashCommands = new Collection();
        
        this.initializeAudio();
        this.setupSystems();
    }

    initializeAudio() {
        // Construct the nodes exactly as Riffy expects
        const nodes = [{
            name: "Main-Node",
            host: config.lavalink.host,
            password: config.lavalink.password,
            port: parseInt(config.lavalink.port) || 2333,
            secure: config.lavalink.secure === true || config.lavalink.secure === "true"
        }];

        // Assign riffy to the client
        this.client.riffy = new Riffy(this.client, nodes, {
            send: (payload) => {
                const guild = this.client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: "ytmsearch",
            restVersion: "v4"
        });
    }

    setupSystems() {
        this.client.statusManager = new StatusManager(this.client);
        this.client.playerHandler = new AudioPlayerHandler(this.client);
        
        // Essential: Forward raw gateway packets to Riffy for voice functionality
        this.client.on('raw', (d) => {
            if (['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(d.t)) {
                this.client.riffy.updateVoiceState(d);
            }
        });
    }

    async start() {
        try {
            await DatabaseConnection();
            MemoryOptimizer.init();
            this.loadModules();
            
            this.client.playerHandler.initializeEvents();
            
            // Log in to Discord
            await this.client.login(config.discord.token || process.env.TOKEN);
            shiva.initialize(this.client);
        } catch (error) {
            console.error('❌ Critical failure during startup:', error);
        }
    }

    loadModules() {
        // Load event handlers
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args, this.client));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args, this.client));
            }
        }

        // Load slash commands into collection
        const slashFiles = fs.readdirSync('./commands/slash').filter(file => file.endsWith('.js'));
        for (const file of slashFiles) {
            const command = require(`./commands/slash/${file}`);
            this.client.slashCommands.set(command.data.name, command);
        }
    }
}

const bot = new MusicBot();
bot.start();
