var express = require('express');
//uh make discord happy bitches
const redirect = encodeURIComponent('https://discordbotindex.com/apiv1/login/callback');
const fetch = require('node-fetch');
const btoa = require('btoa');
const { catchAsync } = require('../utils');
const cookieParser = require('cookie-parser')
var gentoken = require('../middleware/tokengen.js')
const Discord = require('discord.js')
var errorpage = require('../middleware/errors.js')
var DBI = require('../bot.js')
var sanitize = require('../middleware/sanitize.js')
let safeLong = require('../filters/longdesc.json')
var embed = new Discord.RichEmbed()
var token = gentoken();
var clean = require('../middleware/escaping.js')
//login stuff above yeha
//Require discord.js
//weebhook
const webhook = new Discord.WebhookClient("495650221515210758", "ckyLtdQCcDG69lKXlphEE1hLiFAXOmS8NMUyc2ZZczxfng_cNK7ZuDEoQxmKXUDwkeHh");
const spothook = new Discord.WebhookClient("497591845837340675", "W1XN7RM7GY-w66osVHQ-xbhNlsn8ssLNGrgdpC0baJj5685TyvqmWcwocxs5Edd5Y3Ll");
var connection = require("../middleware/mariadb.js")
//require decryption/encryption stuffs
var encryptor = require('../middleware/encryption.js')
var DBIHook = require('../middleware/webhooks.js')
// end and begin
var logger = require('../middleware/logger.js')
const numCheck = function intValid(num) { return /^-?[\d.]+(?:e-?\d+)?$/.test(num); }
var api = express.Router();
//finds bot id, checks if valid
api.get('/bot/:id', function (req, res) {
    logger(req, res, req.params)
    if (numCheck(req.params.id)) {
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, results, fields) {
            //id the results of the query are empty, return unknown
            if (!results[0]) { return res.status(404).json({ error: 'unknown_bot' }) }
            else {
                //if results exist, decrypt the data and send it in a json format
                res.json({
                    botid: encryptor(2, results[0].botid),
                    prefix: encryptor(2, results[0].prefix),
                    newsblurb: encryptor(2, results[0].newsblurb),
                    accepted: encryptor(2, results[0].accepted),
                    shortdesc: encryptor(2, results[0].shortdesc),
                    longdesc: encryptor(2, results[0].longdesc),
                    website: encryptor(2, results[0].website),
                    donate: encryptor(2, results[0].donate),
                    github: encryptor(2, results[0].github),
                    ownerid: encryptor(2, results[0].ownerid),
                    ownername: encryptor(2, results[0].ownername),
                    servers: encryptor(2, results[0].servercount),
                    upvotes: encryptor(2, results[0].upvotepoints)
                })
            }
        });
    }
    //if the id is not an integer, return invalid
    else return res.status(406).json({ error: 'param_must_be_int' })
});
api.get('/bot', function (req, res) {
    //if no id is supplied, return unspecified
    logger(req, res, req.params)
    return res.status(405).json({ error: 'unspecified_bot' })
});
api.get('/', function (req, res) {
    //if an endpoint isnt supplied, return unspecified
    logger(req, res, req.params)
    return res.status(405).json({ error: 'unspecified_method' })
});
api.post('/', function (req, res) {
    //denies the request, well, says no to u meanie
    logger(req, res, req.params)
    return res.status(401).json({ error: 'unauthorized' })
});
api.post('/add', function (req, res) {
    //denies the request, well, says no to u meanie
    let user, username, link;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            res.clearCookie('DBIUSER');
            return res.redirect('/apiv1/login')
        } else username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `/profile/${req.cookies.DBIUSER.userid}`
        DBI.fetchUser(`${req.body.botid}`, true).then((result) => {
            embed
                .setTitle(`Bot Queue - Addition`)
                .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.body.botid}>)\n🔹 **Owner** - **${username}** (<@!${user.userid}>)\n🔸 [**View Bot**](https://discordbotindex.com/bot/${req.body.botid})`)
                .setThumbnail(`https://images.discordapp.net/avatars/${req.body.botid}/${result.avatar}.png?size=512`)
                .setColor('#78db64')
                .setTimestamp(new Date())
            //query the db and see if the bot already exists
            connection.query(`SELECT * FROM DBI WHERE botid = ${result.id}`, function (error, found, fields) {
                //if a result is found, return
                if (found[0]) return res.status(406).json({ error: 'Already added' })
                //if the bot data is false, return
                if (result.bot == false) return res.status(406).json({ error: 'Not a bot' })
                //if nothing else stops it, insert data into the db
                connection.query(`INSERT INTO DBI (botid, shortdesc, longdesc, website, donate, github, ownerid, authkey, servercount, upvotepoints, ownername, prefix, newsblurb, accepted, botname, avatar, queue, hookid, hooktoken, support) VALUES ("${result.id}", ${clean(sanitize(req.body.shortdesc, []))}, ${clean(encryptor(1, sanitize(req.body.longdesc, safeLong)))}, ${clean(encryptor(1, sanitize(req.body.website, [])))}, ${clean(encryptor(1, sanitize(req.body.donate, [])))}, ${clean(encryptor(1, sanitize(req.body.github, [])))}, ${clean(results[0].userid)}, ${clean(encryptor(1, token))}, 0, 0, ${clean(encryptor(1, username))}, ${clean(encryptor(1, sanitize(req.body.prefix, [])))}, "none", "${Date.now()}", "${result.username}#${result.discriminator}", ${clean(encryptor(1, result.avatar))}, 1, NULL, NULL, ${clean(encryptor(1, sanitize(req.body.supportserver, [])))})`)
                res.redirect(`/bot/${req.body.botid}`)
                logger(req, res, req.params)
                return webhook.send(embed)
            })
        });
    });
});
api.post('/spotlight', function (req, res) {
    //denies the request, well, says no to u meanie
    let user, username, link;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            res.clearCookie('DBIUSER')
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `/profile/${req.cookies.DBIUSER.userid}`
        }
        DBI.fetchUser(`${req.body.botid}`, true).then((result) => {
            embed
                .setTitle(`Spotlight - Submission`)
                .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.body.botid}>)\n🔹 **Owner** - **${username}** (<@!${user.userid}>)\n🔸 [**View Bot**](https://discordbotindex.com/bot/${req.body.botid})`)
                .addField('Submission', `\`\`\`${req.body.submission}\`\`\``)
                .setThumbnail(`https://images.discordapp.net/avatars/${req.body.botid}/${result.avatar}.png?size=512`)
                .setColor('#78db64')
                .setTimestamp(new Date())
            //query the db and see if the bot already exists
            connection.query(`SELECT * FROM DBI WHERE botid = ${result.id}`, function (error, found, fields) {
                //if a result is found, return
                if (!found[0]) return res.status(406).json({ error: 'Bot not found' })
                if ((user.userid == found[0].ownerid) == false) return res.status(401).json({ error: 'unauthorized' })
                //if the bot data is false, return
                if (result.bot == false) return res.status(406).json({ error: 'Not a bot' })
                //if nothing else stops it, insert data into the db
                connection.query(`UPDATE DBI set spotlight = 1 WHERE botid = ${clean(req.body.botid)}`)
                res.redirect(`/bot/${req.body.botid}`)
                logger(req, res, req.params)
                return spothook.send(embed)
            })
        });
    });
});
api.post('/edit', function (req, res) {
    //denies the request, well, says no to u meanie
    let user, username, link;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            res.clearCookie('DBIUSER')
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `/profile/${req.cookies.DBIUSER.userid}`
        }
        DBI.fetchUser(`${req.body.botid}`, true).then((result) => {
            embed
                .setTitle(`Bot - Edit`)
                .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.body.botid}>)\n🔹 **Edited By** - **${username}** (<@!${user.userid}>)\n🔸 [**View Bot**](https://discordbotindex.com/bot/${req.body.botid})`)
                .setThumbnail(`https://images.discordapp.net/avatars/${req.body.botid}/${result.avatar}.png?size=512`)
                .setColor('#78db64')
                .setTimestamp(new Date())
            //query the db and see if the bot already exists
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(result.id)}`, function (error, found, fields) {
                //if a result is found, 
                if (!found[0]) return errorpage(req, res, '404', 'The requested bot doesn\'t exist')
                if (results[0].moderator == 2) {
                    connection.query(`UPDATE DBI SET botid = ${clean(result.id)}, shortdesc = ${clean(sanitize(req.body.shortdesc, []))}, longdesc = ${clean(encryptor(1, sanitize(req.body.longdesc, safeLong)))}, website = ${clean(encryptor(1, sanitize(req.body.website, [])))}, donate = ${clean(encryptor(1, sanitize(req.body.donate, [])))}, github = ${clean(encryptor(1, sanitize(req.body.github, [])))}, prefix = ${clean(encryptor(1, sanitize(req.body.prefix, [])))}, botname = ${clean(result.username + '#' + result.discriminator)}, avatar = ${clean(encryptor(1, result.avatar))}, newsblurb = ${clean(sanitize(req.body.botnews, []))}, hookid = ${clean(sanitize(req.body.hookid, []))}, hooktoken = ${clean(sanitize(req.body.hooktoken, []))}, support = ${clean(sanitize(req.body.supportserver, []))} WHERE botid = ${clean(result.id)}`)
                    res.redirect(`/bot/${req.body.botid}`)
                    webhook.send(embed)
                    logger(req, res, req.params)
                } else if (!(found[0].ownerid == user.userid)) {
                    return errorpage(req, res, '401', 'You are not authorized to perform this action.')
                } else {
                    //if nothing else stops it, insert data into the db
                    connection.query(`UPDATE DBI SET botid = ${clean(result.id)}, shortdesc = ${clean(sanitize(req.body.shortdesc, []))}, longdesc = ${clean(encryptor(1, sanitize(req.body.longdesc, safeLong)))}, website = ${clean(encryptor(1, sanitize(req.body.website, [])))}, donate = ${clean(encryptor(1, sanitize(req.body.donate, [])))}, github = ${clean(encryptor(1, sanitize(req.body.github, [])))}, prefix = ${clean(encryptor(1, sanitize(req.body.prefix, [])))}, botname = ${clean(result.username + '#' + result.discriminator)}, avatar = ${clean(encryptor(1, result.avatar))}, newsblurb = ${clean(sanitize(req.body.botnews, []))}, hookid = ${clean(sanitize(req.body.hookid, []))}, hooktoken = ${clean(sanitize(req.body.hooktoken, []))}, support = ${clean(sanitize(req.body.supportserver, []))} WHERE botid = ${clean(result.id)}`)
                    res.redirect(`/bot/${req.body.botid}`)
                    webhook.send(embed)
                    logger(req, res, req.params)
                }
            })
        });
    });
});
api.get('/upvote/:id', function (req, res) {
    let user, didVote;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!req.params.id) return res.redirect('/')
        if (!results[0]) {
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            res.clearCookie('DBIUSER')
            return res.redirect('/apiv1/login')
        }
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, bot, fields) {
            //if a result is found, return
            if (!bot[0]) return res.redirect('/')
            connection.query(`SELECT * FROM upvotes WHERE botid = ${clean(bot[0].botid)} && userid = ${clean(user.userid)}`, function (error, upvote, fields) {
                if (!upvote[0]) {
                    connection.query(`INSERT INTO upvotes (botid, userid, total, lastvote) VALUES (${clean(bot[0].botid)}, ${clean(user.userid)}, 1, ${Date.now() + 86400000})`)
                    connection.query(`UPDATE DBI SET upvotepoints = ${(bot[0].upvotepoints + 1)} WHERE botid = ${clean(bot[0].botid)}`)
                    didVote = 't'
                    if ((!bot[0].hookid || !bot[0].hooktoken) == false) {
                        DBIHook(encryptor(2, bot[0].hookid), encryptor(2, bot[0].hooktoken), user.userid)
                    }
                } else if (upvote[0].lastvote > Date.now()) {
                    didVote = 't'
                } else {
                    didVote = 't'
                    connection.query(`UPDATE DBI SET upvotepoints = ${(bot[0].upvotepoints + 1)} WHERE botid = ${clean(bot[0].botid)}`)
                    connection.query(`UPDATE upvotes SET lastvote = ${Date.now() + 86400000} WHERE botid = ${clean(bot[0].botid)} AND userid = ${clean(user.userid)}`)
                    if ((!bot[0].hookid || !bot[0].hooktoken) == false) {
                        DBIHook(encryptor(2, bot[0].hookid), encryptor(2, bot[0].hooktoken), user.userid)
                    }
                }
                res.redirect(`/bot/${req.params.id}`)
                logger(req, res, req.params)
            });
        });
    });
});
api.post('/bot/:id', function (req, res) {
    logger(req, res, req.params)
    if (numCheck(req.params.id)) {
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, results, fields) {
            if (!results[0]) return res.status(404).json({ error: 'unknown_bot' })
            if (req.headers.authorization !== encryptor(2, results[0].authkey)) return res.status(403).json({ error: 'unauthorized' })
            if (!req.body) return res.json({ error: 'missing_data' })
            if (req.body.server_count) {
                if (!numCheck(req.body.server_count)) { return res.json({ error: 'incorrect_format' })}
                connection.query(`UPDATE DBI SET servercount = ${clean(sanitize(req.body.server_count))} WHERE botid = ${clean(sanitize(req.params.id))}`, function (error, results, fields) {
                return res.status(200).json({ result: 'successful' })
                })
            } else {
                return res.status(404).json({ error: 'unknown_endpoint' })
            }
        })
    } else {
        return res.json({ error: 'invalid_id' })
    }
})
//login stuff
api.get('/login', (req, res) => {
    res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);

});
//adding bots
api.get('/login/callback', catchAsync(async (req, res) => {
    if (!req.query.code) throw new Error('NoCodeProvided');
    const code = req.query.code;
    const creds = btoa(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`);
    const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Basic ${creds}`,
            },
        });
    // the response from the dapi with the credentials
    const json = await response.json();
    let options = {
        maxAge: 21600000, //6 hours
        httpsOnly: true,
        path: '/',
        domain: '.discordbotindex.com',
        secure: true
    }
    //get userdata from the api
    const getuser = await fetch(`https://discordapp.com/api/users/@me`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${json.access_token}`,
            },
        });
    //await the response
    const user = await getuser.json()
    //after getting the user, finally set the cookie and update the db
    res.cookie('DBIUSER', { token: token, userid: user.id }, options)
    //set cookie and do db saving
    let avatar;
    if (user.avatar == null) avatar = '3'
    else avatar = user.avatar
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.id)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) { connection.query(`INSERT INTO users (userid, username, discriminator, access_token, refresh_token, avatar, authkey, moderator) VALUES (${clean(user.id)}, ${clean(encryptor(1, user.username))}, ${clean(encryptor(1, user.discriminator))}, ${clean(encryptor(1, json.access_token))}, ${clean(encryptor(1, json.refresh_token))}, ${clean(encryptor(1, avatar))}, ${clean(token)}, 0)`) }
        else {
            console.log(`[Log] [Login] | Updated database information for user ${clean(user.id)}`)
            //update the information in the database to match the new cookie we set
            connection.query(`UPDATE users SET userid = ${clean(user.id)}, username = ${clean(encryptor(1, user.username))}, discriminator = ${clean(encryptor(1, user.discriminator))}, access_token = ${clean(encryptor(1, json.access_token))}, refresh_token = ${clean(encryptor(1, json.refresh_token))}, avatar = ${clean(encryptor(1, avatar))}, authkey = ${clean(token)} WHERE userid = ${clean(user.id)}`)
        }
    });
    //finally, redirect
    return res.redirect("/");
}));
api.get('/logout', (req, res) => {
    res.clearCookie('DBIUSER', { path: '/', domain: '.discordbotindex.com' });
    return res.redirect('/')
});
api.get('/delete/:id', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //clear any old cookies bc yeah.
            res.redirect('/apiv1/login')
            return res.clearCookie('DBIUSER')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `/profile/${req.cookies.DBIUSER.userid}`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, deleted, fields) {
            if (results[0].moderator == 2 || results[0].userid == deleted[0].ownerid) {
                if (!deleted[0]) return errorpage(req, res, '404', 'We weren\'t able to find that bot - if this incorrect, contact a website admin.')
                connection.query(`DELETE from DBI where botid = ${clean(deleted[0].botid)}`)
                DBI.fetchUser(`${req.params.id}`, true).then((result) => {
                    embed
                        .setTitle(`Bot - Deleted`)
                        .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.params.id}>)\n🔹 **Deleted By** - **${username}** (<@!${user.userid}>)`)
                        .setThumbnail(`https://images.discordapp.net/avatars/${req.params.id}/${result.avatar}.png?size=512`)
                        .setColor('#78db64')
                        .setTimestamp(new Date())
                    webhook.send(embed)
                });
                logger(req, res, req.params)
                return res.redirect('/')
            } else {
                return errorpage(req, res, '401', 'You are not authorized to perform this action.')
            }
        });
    });
});
//just for ease of mind
console.log('[Log] [API] | API Loaded with no errors')
//export
module.exports = api;
