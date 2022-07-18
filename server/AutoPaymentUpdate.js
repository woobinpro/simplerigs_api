var bitcoin_client = require('./bitcoin_client');
var app_config = require('./config/app.config.js');
var bitcoin = require("./utils/bitcoin");
var app_model = require("./models/simplerigs.model.js");
function getPaymentStatus() {
    bitcoin_client.listTransactions(function (err, result) {
        if(!err){
            result.forEach((item, i) => {
                if (item.category === 'receive' && item.confirmations > 0){
                    var uid    = item.label;
                    var txtid  = item.txid;
                    bitcoin.toUSD(item.amount, function(amount) {
                        if(amount!=null){
                            app_model.existPlan(txtid, function (exists) {
                                if (!exists) {
                                    //Save txid to db
                                    app_model.savePlan(uid, parseInt(amount) + parseInt(10), item.amount, txtid);
                                } else {
                                    //console.log('TXID is old: ', txtid);
                                }
                            });
                        }
                    });
                }
            });
        }
        else console.log(err);
    });
};
exports.startChecker = () => {
    console.log('started cheker');
    getPaymentStatus();
    setInterval(function(){
        getPaymentStatus();
    }, app_config.UPDATE_RATE);
};