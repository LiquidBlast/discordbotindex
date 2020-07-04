let encryptor = require('./encryption.js')
let Discord = require('discord.js')
let DBIHook = function (hookid, hooktoken, userid) {
    let hook = new Discord.WebhookClient(`${hookid}`, `${hooktoken}`);
    if (hookid == null || hookid == 'NULL' || hookid == 'null') {
        return;
    } else if (hooktoken == null || hooktoken == 'NULL' || hooktoken == 'null') {
        return;
    } else if (!userid) {
        return;
    } else {
        return hook.send(`${userid}`).catch(Error => console.log('[Alert] Posting vote for a webhook failed.'))
    }
}
module.exports = DBIHook;