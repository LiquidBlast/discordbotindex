let moment = require('moment')
function timeSent(req, res, param) {
    console.log(`[Log] [${req.originalUrl}] | A new ${req.method} request received at ` + moment().format('MMMM Do YYYY, h:mm:ss a') + ` | ${req.headers['x-forwarded-for']}`);
}
module.exports = timeSent;
