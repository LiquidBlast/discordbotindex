var express = require('express');
var connection = require("../middleware/mariadb.js")
var ms = require('../middleware/msConverter.js')
var encryptor = require('../middleware/encryption.js')
var DBI = require('../bot.js')
var errorpage = require('../middleware/errors.js')
var logger = require('../middleware/logger.js')
const Discord = require('discord.js')
var embed = new Discord.RichEmbed()
var clean = require('../middleware/escaping.js')
const webhook = new Discord.WebhookClient("495650221515210758", "ckyLtdQCcDG69lKXlphEE1hLiFAXOmS8NMUyc2ZZczxfng_cNK7ZuDEoQxmKXUDwkeHh");
const numCheck = function intValid(num) { return /^-?[\d.]+(?:e-?\d+)?$/.test(num); }
var moderator = express.Router();

moderator.get('/', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    let noneFound = ''
    let spotFound = ''
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE queue = 1`, function (error, botqueue, fields) {
                connection.query(`SELECT * FROM DBI WHERE spotlight >= 1 && queue = 0`, function (error, spotqueue, fields) {
                    if (!botqueue[0]) noneFound = 'Looks like the queue is empty, suppose that\'s a good thing.'
                    if (!spotqueue[0]) spotFound = 'The spotlight queue is completely empty, neato!'
                    //I hate this code but the encryptor doesn't work with mysql row dumps so I gotta do this gross gross
                    var decryptedData = [];
                    botqueue.forEach((e) => {
                        let obj = {
                            'name': encryptor(2, e.botname),
                            'avatar': encryptor(2, e.avatar),
                            'ownername': encryptor(2, e.ownername),
                            'shortdesc': encryptor(2, e.shortdesc),
                            'botid': encryptor(2, e.botid),
                            'ownerid': encryptor(2, e.ownerid),
                            'added': ms(Date.now() - e.accepted)
                        }
                        decryptedData.push(obj)
                    })
                        var decryptedSpot = [];
                        spotqueue.forEach((e) => {
                            let status;
                            if(e.spotlight == 1) status = 'In Queue'
                            else status = 'Currently Spotlight'
                            let obj = {
                                'name': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'ownername': encryptor(2, e.ownername),
                                'shortdesc': encryptor(2, e.shortdesc),
                                'botid': encryptor(2, e.botid),
                                'ownerid': encryptor(2, e.ownerid),
                                'added': ms(Date.now() - e.accepted),
                                'spotlight': status
                            }
                            decryptedSpot.push(obj)
                        })
                        res.render('moderator.ejs', { username: username, link: link, data: decryptedData, spotdata: decryptedSpot, spotFound: spotFound, noneFound: noneFound, avatar: avatar, user: user, total: botqueue.length });
                        logger(req, res, req.params)
                    });
                });
            } else {
                    return errorpage(req, res, 401, 'You are not authorized to view this page.')
                }
    });
});
moderator.get('/deny/:id', function (req, res) {
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, denied, fields) {
                if (!denied[0]) return res.json({ error: 'unknown_bot' })
                if (denied[0].queue == 0) return res.json({ error: 'already_accepted' })
                res.render('deny.ejs', { username: username, link: link, botname: encryptor(2, denied[0].botname), botid: denied[0].botid, avatar: avatar, user: user })
                logger(req, res, req.params)
            });
        } else {
            return errorpage(req, res, 401, 'You are not authorized to view this page.')
        }
    });
});
moderator.post('/deny', function (req, res) {
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.body.botid)}`, function (error, denied, fields) {
                if (!denied[0]) return errorpage(req, res, 404, 'Unknown bot - are you sure you are denying a valid bot?')
                if (denied[0].queue == 0) return errorpage(req, res, 406, 'Bot already accepted. Check the queue again.')
                connection.query(`DELETE from DBI where botid = ${clean(denied[0].botid)}`)
                DBI.fetchUser(`${req.body.botid}`, true).then((result) => {
                    embed
                        .setTitle(`Bot Queue - Denied`)
                        .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.body.botid}>)\n🔹 **Denied By** - **${username}** (<@!${user.userid}>)\n🔸 **Reason**\n\`\`\`${req.body.reason}\`\`\``)
                        .setThumbnail(`https://images.discordapp.net/avatars/${req.body.botid}/${result.avatar}.png?size=512`)
                        .setColor('#78db64')
                        .setTimestamp(new Date())
                    webhook.send(embed)
                });
                logger(req, res, req.params)
                return res.redirect('/')
            });
        } else {
            return errorpage(req, res, 401, 'You are not authorized to view this page.')
        }
    });
});
moderator.get('/approve/:id', function (req, res) {
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, accepted, fields) {
                if (!accepted[0]) return errorpage(req, res, 404, 'Unknown bot - are you sure you are denying a valid bot?')
                if (accepted[0].queue == 0) return errorpage(req, res, 406, 'Bot already accepted. Check the queue again.')
                connection.query(`UPDATE DBI SET queue = 0 where botid = ${clean(accepted[0].botid)}`)
                DBI.fetchUser(`${req.params.id}`, true).then((result) => {
                    embed
                        .setTitle(`Bot Queue - Accepted`)
                        .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.params.id}>)\n🔹 **Accepted By** - **${username}** (<@!${user.userid}>)\n🔸 [**View Bot**](https://discordbotindex.com/bot/${req.params.id})`)
                        .setThumbnail(`https://images.discordapp.net/avatars/${req.params.id}/${result.avatar}.png?size=512`)
                        .setColor('#78db64')
                        .setTimestamp(new Date())
                    webhook.send(embed)
                });
                res.redirect('/moderator')
                logger(req, res, req.params)
            });
        } else {
            return errorpage(req, res, 401, 'You are not authorized to view this page.')
        }
    });
});
moderator.get('/spotadd/:id', function (req, res) {
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, accepted, fields) {
                if (!accepted[0]) return errorpage(req, res, 404, 'Unknown bot - are you sure you are denying a valid bot?')
                if (accepted[0].queue == 1) return errorpage(req, res, 406, 'This bot has not been approved yet, it cannot be made spotlight.')
                connection.query(`UPDATE DBI SET spotlight = 2 where botid = ${clean(accepted[0].botid)}`)
                DBI.fetchUser(`${req.params.id}`, true).then((result) => {
                    embed
                        .setTitle(`Spotlight Bot - Accepted`)
                        .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.params.id}>)\n🔹 **Spotlight Given By** - **${username}** (<@!${user.userid}>)`)
                        .setThumbnail(`https://images.discordapp.net/avatars/${req.params.id}/${result.avatar}.png?size=512`)
                        .setColor('#78db64')
                        .setTimestamp(new Date())
                    webhook.send(embed)
                });
                res.redirect('/moderator')
                logger(req, res, req.params)
            });
        } else {
            return errorpage(req, res, 401, 'You are not authorized to view this page.')
        }
    });
});
moderator.get('/spotdel/:id', function (req, res) {
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
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Check if user is a moderator
        if (results[0].moderator >= 2) {
            connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, accepted, fields) {
                if (!accepted[0]) return errorpage(req, res, 404, 'Unknown bot - are you sure you are denying a valid bot?')
                if (accepted[0].queue == 1) return errorpage(req, res, 406, 'Bot not accepted yet - it cannot be made spotlight until it has been approved.')
                connection.query(`UPDATE DBI SET spotlight = 0 where botid = ${clean(accepted[0].botid)}`)
                DBI.fetchUser(`${req.params.id}`, true).then((result) => {
                    embed
                        .setTitle(`Spotlight Bot - Denied/Removed`)
                        .setDescription(`🔸 **${result.username}#${result.discriminator}** (<@!${req.params.id}>)\n🔹 **Spotlight Denied/Removed By** - **${username}** (<@!${user.userid}>)`)
                        .setThumbnail(`https://images.discordapp.net/avatars/${req.params.id}/${result.avatar}.png?size=512`)
                        .setColor('#78db64')
                        .setTimestamp(new Date())
                    webhook.send(embed)
                });
                res.redirect('/moderator')
                logger(req, res, req.params)
            });
        } else {
            return errorpage(req, res, 401, 'You are not authorized to view this page.')
        }
    });
});
module.exports = moderator;