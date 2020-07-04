let mysql = require('mysql');
let connection = mysql.createConnection({
    host: 'srgg.de',
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: 'DBI'
});

connection.connect(function (err) {
    if (err) {
        console.error('[Database] [Error] | ' + err.stack);
        return;
    }
    console.log('[Database] [Connected] | Connection ID: ' + connection.threadId);
});
module.exports = connection;
