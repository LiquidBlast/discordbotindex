var express = require('express');
var connection = require("../middleware/mariadb.js")
var ms = require('../middleware/msConverter.js')
var encryptor = require('../middleware/encryption.js')
var logger = require('../middleware/logger.js')
var clean = require('../middleware/escaping.js')
var errorpage = require('../middleware/errors.js')
const numCheck = function intValid(num) { return /^-?[\d.]+(?:e-?\d+)?$/.test(num); }
var pages = express.Router();

//homepage
pages.get('/', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar, moderator;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none', moderator = 0
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none', moderator = 0
        } else {
            //decrypt
            if (results[0].moderator == 2) moderator = 1
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //Note - this is an annoying process of querying, but when running tests it didn't take more than 0:00.31s - Because I have to select each of the rows by themselves, this is what happens, gross, I agree
        //get top voted
        connection.query(`SELECT * FROM DBI where queue = 0 ORDER BY upvotepoints DESC LIMIT 6`, function (error, resultstop, fields) {
            //get newest
            connection.query(`SELECT * FROM DBI WHERE queue = 0 ORDER BY accepted DESC LIMIT 6`, function (error, resultsnew, fields) {
                //get random
                connection.query(`SELECT * FROM DBI where queue = 0 ORDER BY RAND() DESC LIMIT 6`, function (error, resultsrandom, fields) {
                //get the spotlight bots
                connection.query(`SELECT * FROM DBI WHERE spotlight = 2 && queue = 0 ORDER BY RAND() LIMIT 2`, function (error, spotlight, fields) {
                    //get news
                    connection.query(`SELECT * FROM DBI WHERE (newsblurb != "none" && queue = 0) ORDER BY RAND() LIMIT 6`, function (error, news, fields) {
                        /*
                        * Welcome to object hell. Because this shit is encrypted, I have to put it back into an object and decrypt. Gross. Doesn't take more than a 5th of a ms though.
                        * 
                        * 
                        * 
                        */
                        var decryptedTop = [];
                        resultstop.forEach((e) => {
                            let obj = {
                                'botname': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'shortdesc': encryptor(2, e.shortdesc),
                                'botid': encryptor(2, e.botid)
                            }
                            decryptedTop.push(obj)
                        })
                        var decryptedNew = [];
                        resultsnew.forEach((e) => {
                            let obj = {
                                'botname': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'shortdesc': encryptor(2, e.shortdesc),
                                'botid': encryptor(2, e.botid)
                            }
                            decryptedNew.push(obj)
                        })
                        var decryptedRandom = [];
                        resultsrandom.forEach((e) => {
                            let obj = {
                                'botname': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'shortdesc': encryptor(2, e.shortdesc),
                                'botid': encryptor(2, e.botid)
                            }
                            decryptedRandom.push(obj)
                        })
                        var decryptedSpotlight = [];
                        spotlight.forEach((e) => {
                            let s = {
                                'botname': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'shortdesc': encryptor(2, e.shortdesc),
                                'botid': encryptor(2, e.botid)
                            }
                            decryptedSpotlight.push(s)
                        })
                        var decryptedNews = [];
                        news.forEach((e) => {
                            let n = {
                                'botname': encryptor(2, e.botname),
                                'avatar': encryptor(2, e.avatar),
                                'newsblurb': encryptor(2, e.newsblurb),
                                'botid': encryptor(2, e.botid)
                            }
                            decryptedNews.push(n)
                        })
                        res.render('home.ejs', { username: username, link: link, topbots: decryptedTop, newbots: decryptedNew, randbots: decryptedRandom, user: user, avatar: avatar, spotlight: decryptedSpotlight, news: decryptedNews, moderator: moderator });
                        logger(req, res, req.params)
                    });

                });
            });
        });
        });
    });
});
//index pages & the bot pages themselves
pages.get('/bots?:page', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //get the sort type
        let sortBy, display, sortDesc, sorted;
        if (req.query.sort == 'upvotes') {
            sortBy = 'upvotepoints', display = 'Top Voted', sorted = 'upvotes'
            sortDesc = 'These are the bots with the most upvote points!'
        } else if (req.query.sort == 'new') {
            sortBy = 'accepted', display = 'New Bots', sorted = 'new'
            sortDesc = 'These bots have recently been added to the index!'
        } else {
            sortBy = 'upvotepoints', display = 'Top Voted', sorted = 'upvotes'
            sortDesc = 'These are the bots with the most upvote points!'
        }
        let pageCount;
        if (numCheck(req.params.page)) {
            if (req.params.page > 100) {
                pageCount = 100
            } else if (req.params.page <= 0) {
                pageCount = 1
            } else {
                pageCount = req.params.page
            }
        } else {
            pageCount = 1
        }
        let noneFound = '';
        connection.query(`SELECT * FROM DBI WHERE queue = 0 ORDER BY ${sortBy} DESC LIMIT ${Math.floor(pageCount * 21) - 21}, ${Math.floor(pageCount * 21)}`, function (error, resultsquery, fields) {
            if (!resultsquery[0]) noneFound = 'No bots were found on this page.'
            //I hate this code but the encryptor doesn't work with mysql row dumps so I gotta do this gross gross
            var decryptedData = [];
            resultsquery.forEach((e) => {
                let obj = {
                    'name': encryptor(2, e.botname),
                    'avatar': encryptor(2, e.avatar),
                    'shortdesc': encryptor(2, e.shortdesc),
                    'botid': encryptor(2, e.botid)
                }
                decryptedData.push(obj)
            })
            res.render('bots.ejs', { username: username, link: link, data: decryptedData, page: Math.floor(pageCount), display: display, sortDesc: sortDesc, noneFound: noneFound, sorted: sorted, avatar: avatar, user: user });
            logger(req, res, req.params)
        });
    });
});
//loads bot pages
pages.get('/bot/:id', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, resultuser, fields) {
        //id the results of the query are empty, return unknown
        if (!resultuser[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'

        } else if (encryptor(2, user.token) !== encryptor(2, resultuser[0].authkey)) {
            //if not logged in, redirect
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, resultuser[0].username) + '#' + encryptor(2, resultuser[0].discriminator), link = `#`, avatar = `${encryptor(2, resultuser[0].avatar)}`
        }
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, results, fields) {
            //id the results of the query are empty, return unknown
            if (!results[0]) return errorpage(req, res, 404, 'That bot doesn\'t seem to exist on the index. If this is incorrect, contact a website admin.')
            //if results exist, decrypt the data and send it in a sortable format
            let obj = {
                'botname': encryptor(2, results[0].botname),
                'avatar': encryptor(2, results[0].avatar),
                'shortdesc': encryptor(2, results[0].shortdesc),
                'botid': encryptor(2, results[0].botid),
                'longdesc': encryptor(2, results[0].longdesc),
                'website': encryptor(2, results[0].website),
                'donate': encryptor(2, results[0].donate),
                'github': encryptor(2, results[0].github),
                'ownerid': results[0].ownerid,
                'servercount': Math.floor(results[0].servercount).toLocaleString(),
                'upvotepoints': results[0].upvotepoints,
                'ownername': encryptor(2, results[0].ownername),
                'prefix': encryptor(2, results[0].prefix),
                'newsblurb': encryptor(2, results[0].newsblurb),
                'support': encryptor(2, results[0].support)
            }
            //This just prevents users from having to login to view bots. Weird placement, but I didn't think about it till later on.
            if (!resultuser[0]) {
                if (results[0].queue == 1) return errorpage(req, res, 401, 'You are not authorized to view this page - this bot is in the queue and is awaiting approval.')
                else return res.render('botpage.ejs', { username: username, link: link, decrypted: obj, voted: 'f', canEdit: 'f', avatar: avatar, user: user, nextVote: 0 });
            }
            let didVote, lastvote;
            connection.query(`SELECT * FROM upvotes WHERE (botid = ${clean(results[0].botid)}) AND (userid = ${clean(user.userid)})`, function (error, upvote, fields) {
                if (!upvote || !upvote[0]) {
                    didVote = 'f', lastvote = 1
                } else if (upvote[0].lastvote > Date.now()) {
                    didVote = 't', lastvote = upvote[0].lastvote
                } else {
                    didVote = 'f', lastvote = upvote[0].lastvote
                }
                let canEdit;
                if (user.userid == results[0].ownerid) {
                    canEdit = 'y'
                } else if (resultuser[0].moderator == 2) {
                    canEdit = 'y'
                } else {
                    canEdit = 'f'
                }
                if(canEdit == 'f' && results[0].queue == 1) return errorpage(req, res, 401, 'You are not authorized to view this page - this bot is in the queue and is awaiting approval.')
                res.render('botpage.ejs', { username: username, link: link, decrypted: obj, voted: didVote, canEdit: canEdit, avatar: avatar, user: user, nextVote: ms(lastvote - Date.now()) });
                logger(req, res, req.params)
            });
        });
    });
});
pages.get('/bot/:id/edit', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, resultuser, fields) {
        //id the results of the query are empty, return unknown
        if (!req.params.id) return errorpage(req, res, 406, 'Unspecified bot - please try again and provide a bot id in the URL.')
        if (!resultuser[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, resultuser[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, resultuser[0].username) + '#' + encryptor(2, resultuser[0].discriminator), link = `#`, avatar = `${encryptor(2, resultuser[0].avatar)}`
        }
        connection.query(`SELECT * FROM DBI WHERE botid = ${clean(req.params.id)}`, function (error, results, fields) {
            //id the results of the query are empty, return unknown
            if (!results[0]) return errorpage(req, res, 404, 'We weren\'t able to find this bot on the index. Try searching for it?')
            //if the result of the bots owner doesnt actually equal the userid, don't allow the user to edit it.
            let obj = {
                'botname': encryptor(2, results[0].botname),
                'avatar': encryptor(2, results[0].avatar),
                'shortdesc': encryptor(2, results[0].shortdesc),
                'botid': encryptor(2, results[0].botid),
                'longdesc': encryptor(2, results[0].longdesc),
                'website': encryptor(2, results[0].website),
                'donate': encryptor(2, results[0].donate),
                'github': encryptor(2, results[0].github),
                'ownerid': results[0].ownerid,
                'servercount': Math.floor(results[0].servercount).toLocaleString(),
                'upvotepoints': results[0].upvotepoints,
                'ownername': encryptor(2, results[0].ownername),
                'prefix': encryptor(2, results[0].prefix),
                'newsblurb': encryptor(2, results[0].newsblurb),
                'support': encryptor(2, results[0].support),
                'accepted': results[0].queue,
                'authtoken': encryptor(2, results[0].authkey),
                'hookid': encryptor(2, results[0].hookid),
                'hooktoken': encryptor(2, results[0].hooktoken)
            }
            //Checks if the user can actually edit the page 
            let canEdit;
            if (user.userid == results[0].ownerid) {
                canEdit = 'y'
            } else if (resultuser[0].moderator >= 2) {
                canEdit = 'y'
            } else {
                canEdit = 'f'
            }
            if (canEdit == 'f') return errorpage(req, res, 401, 'You are not authorized to perform this action.');
            res.render('edit.ejs', { username: username, link: link, decrypted: obj, canEdit: canEdit, avatar: avatar, user: user });
            logger(req, res, req.params)
        });
    });
});
//submit page
pages.get('/submit', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        res.render('submit.ejs', { username: username, link: link, userid: user.userid, avatar: avatar, user: user });
        logger(req, res, req.params)
    });
});
pages.get('/spotlight', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //if not logged in, redirect
            return res.redirect('/apiv1/login')
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //clear any old cookies bc yeah.
            res.clearCookie('DBIUSER')
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        res.render('spotlight.ejs', { username: username, link: link, userid: user.userid, avatar: avatar, user: user });
        logger(req, res, req.params)
    });
});
pages.get('/search?', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        //get the sort type
        let isEmpty
        let noneFound = '';
        if (!req.query.search || req.query.search == '') isEmpty = 'y'
        else isEmpty = 'n'
        connection.query(`SELECT * FROM DBI WHERE (shortdesc LIKE ${clean('%' + req.query.search + '%')} || botname LIKE ${clean(req.query.search + '%')}) && queue = 0 LIMIT 30`, function (error, resultsquery, fields) {
            if (!resultsquery[0]) noneFound = 'No bots that matched your search were found.'
            //I hate this code but the encryptor doesn't work with mysql row dumps so I gotta do this gross gross
            var decryptedData = [];
            resultsquery.forEach((e) => {
                let obj = {
                    'name': encryptor(2, e.botname),
                    'avatar': encryptor(2, e.avatar),
                    'shortdesc': encryptor(2, e.shortdesc),
                    'botid': encryptor(2, e.botid)
                }
                decryptedData.push(obj)
            })
            res.render('search.ejs', { username: username, link: link, data: decryptedData, noneFound: noneFound, avatar: avatar, user: user, total: resultsquery.length, search: req.query.search, isEmpty: isEmpty });
            logger(req, res, req.params)
        });
    });
});
pages.get('/documentation', function (req, res) {
    res.set('Content-Type', 'text/html');
    let user, username, link, avatar;
    if (req.cookies.DBIUSER == undefined) user = 0
    else user = req.cookies.DBIUSER
    connection.query(`SELECT * FROM users WHERE userid = ${clean(user.userid)}`, function (error, results, fields) {
        //id the results of the query are empty, return unknown
        if (!results[0]) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            //if not logged in, redirect
        } else if (encryptor(2, user.token) !== encryptor(2, results[0].authkey)) {
            username = 'Login', link = '/apiv1/login', avatar = 'none'
            return res.redirect('/apiv1/login')
        } else {
            //decrypt
            username = encryptor(2, results[0].username) + '#' + encryptor(2, results[0].discriminator), link = `#`, avatar = `${encryptor(2, results[0].avatar)}`
        }
        res.render('documentation.ejs', { username: username, link: link, userid: user.userid, avatar: avatar, user: user });
        logger(req, res, req.params)
    });
});

module.exports = pages;