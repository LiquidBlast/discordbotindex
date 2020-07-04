//begin the bot login
const Discord = require("discord.js");
const fs = require('fs')
const bot = new Discord.Client({
  fetchAllMembers: false,
  disableEveryone: true, // Disable @everyone pings bc pls
  disabledEvents: ['TYPING_START', 'TYPING_STOP', 'RELATIONSHIP_ADD', 'RELATIONSHIP_REMOVE', 'USER_SETTINGS_UPDATE', 'USER_NOTE_UPDATE', 'VOICE_SERVER_UPDATE', 'GUILD_MEMBER_SPEAKING', 'USER_NOTE_UPDATE', 'VOICE_STATE_UPDATE'], // Disable all useless events
  http: { api: 'https://discordapp.com/api', version: 7 }, // Set the API to v7
  messageCacheMaxSize: 50,
  messageCacheLifetime: 50,
  messageSweepInterval: 50,
});
fs.readdir("./events/", (err, files) => {
  if (err) return console.log(`${err}`)
  files.forEach(file => {
    let eventFunction = require(`./events/${file}`);
    let eventName = file.split(".")[0];
    bot.on(eventName, (...args) => eventFunction.run(bot, ...args));
  });
});
bot.commands = new Discord.Collection();
bot.aliases = new Discord.Collection();
bot.config = require('./config.json')
process.on('unhandledRejection', error => console.error(`[Error]\nType: Promise Rejection\n\n-------------------Details-------------------\n${error}\n------------------------------------------\n`));
bot.login(bot.config.token)
console.log('[DBI Bot] Loaded and connected to discord.')
module.exports = bot;
