exports.run = (client, message) => {
    function connectMsg() {
        client.user.setGame(`with some cool bots in the city`);
        console.log(`DBI has loaded, & currently has a ping of ${Math.floor(client.ping)}ms`);
    }
    setTimeout(connectMsg, 17200);
};