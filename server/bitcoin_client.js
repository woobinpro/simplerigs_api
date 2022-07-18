var bitcoin = require('bitcoin');
var bitcoin_client = new bitcoin.Client({
    host: '127.0.0.1',
    port: '8332',
    user: 'multichainrpc',
    pass: 'domisol123',
    ssl: false,
    sslStrict: false
});
module.exports = bitcoin_client;