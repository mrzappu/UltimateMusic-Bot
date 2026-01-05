const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Riffy } = require('riffy');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const DatabaseConnection = require('./database/connection');
const AudioPlayerHandler = require('./utils/player');
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
    }

    initializeAudio() {
        const nodes = [{
            name: "Main-Node",
            host: config.lavalink.host,
            password: config.lavalink.password,
            port: parseInt(config.lavalink.port) || 2333,
            secure: config.lavalink.secure === true || config.lavalink.secure === "true"
        }];

        this.client.riffy = new Riffy(this.client, nodes, {
            send: (payload) => {
                const guild = this.client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: "ytmsearch",
            restVersion: "v4"
        });

        this.client.playerHandler = new AudioPlayerHandler(this.client);
    }

    async start() {
        await DatabaseConnection();
        
        // Load Events
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            // Use the native event names directly
            if (event.once) this.client.once(event.name, (...args) => event.execute(...args, this.client));
            else this.client.on(event.name, (...args) => event.execute(...args, this.client));
        }

        // Voice state listener
        this.client.on('raw', d => {
            if (['VOICE_STATE_UPDATE', 'VOICE_SERVER_UPDATE'].includes(d.t)) this.client.riffy.updateVoiceState(d);
        });

        this.client.playerHandler.initializeEvents();
        await this.client.login(config.discord.token || process.env.TOKEN);
    }
}

new MusicBot().start();
