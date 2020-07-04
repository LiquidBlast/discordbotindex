//set env vars
require('dotenv').config({ path: "../important.env" })
const helmet = require('helmet')
const express = require('express');
const app = express();
const apiv1 = require('./routers/api.js');
const pages = require('./routers/pages.js');
const moderator = require('./routers/moderator.js');
const encryptor = require('./middleware/encryption.js')
const logger = require('./middleware/logger.js')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const fs = require('fs')
const tracer = require('dd-trace').init()
//set SEO
const xssFilter = require('x-xss-protection')
app.use(helmet({
  expectCt: true,
  hidePoweredBy: false, //Bc I set a custom one
  noCache: true,
  referrerPolicy: true
}))
app.use(xssFilter())
app.use(cookieParser())
app.set('views', './views');
app.set('view engine', 'ejs');
//set custom headers
function customHead(req, res, next) {
  res.setHeader('X-Powered-By', 'Discord Bot Index v1');
  next();
}
app.use(customHead);
//the above sets the headers that we want.
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
//we need static shit so uh yeah here you go
//static pages
app.use(express.static(('./views')));
//static assets
app.use(express.static('./assets'));
//static materialize css and js
app.use(express.static('./materialize'));
//set the viewpoint to ejs
//Below sets the api endpoint for v1
app.use('/apiv1', apiv1);
//yay the homepage (will set a router for this, just a test page rn)
app.use('/', pages);
app.use('/moderator', moderator)
//Anything that doesn't match what was expected will return a 404 here
app.use(function (req, res, next) {
  return res.status(404).render('404.ejs', { code: 404, info: 'We weren\'t able to find that page - are you sure it exists? Make sure you typed the URL correctly.' })
})
//basic error handling for the login shit
app.use((err, req, res, next) => {
  return res.render('404.ejs', { code: 'Something went wrong.', info: 'An action was missing the required arguments and exited early. Try again later.' })
});
//begin listening on port 1337
app.listen(1234)
console.log('[Log] [Launch] | Website listening on port 1337')
