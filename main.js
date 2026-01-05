/**
 * Ultimate Music Bot - Core Application
 * @version 1.0.6
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Riffy } = require('riffy');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const DatabaseConnection = require('./database/connection');
const AudioPlayerHandler = require('./utils/player');
const StatusManager = require('./utils/statusManager');
require('dotenv').config();

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
        const nodes = [{
            name: "Primary-Node",
            host: config.lavalink.host,
            password: config.lavalink.password,
            port: parseInt(config.lavalink.port) || 2333,
            secure: config.lavalink.secure === true || config.lavalink.secure === "true"
        }];

        // Assign riffy to client - Do NOT call .init() here
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
        
        // Essential for Voice functionality
        this.client.on('raw', (d) => {
            if (['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(d.t)) {
                this.client.riffy.updateVoiceState(d);
            }
        });
    }

    async start() {
        try {
            await DatabaseConnection();
            this.loadModules();
            this.client.playerHandler.initializeEvents();
            await this.client.login(config.discord.token || process.env.TOKEN);
        } catch (error) {
            console.error('❌ Startup Error:', error);
        }
    }

    loadModules() {
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args, this.client));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args, this.client));
            }
        }

        const slashFiles = fs.readdirSync('./commands/slash').filter(file => file.endsWith('.js'));
        for (const file of slashFiles) {
            const command = require(`./commands/slash/${file}`);
            this.client.slashCommands.set(command.data.name, command);
        }
    }
}

new MusicBot().start();
