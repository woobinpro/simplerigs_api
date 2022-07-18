const axios = require('axios');
// Declare Bitcoin object
const Bitcoin = {};
Bitcoin.toUSD = function(amount, result) {
    axios.get('https://bitpay.com/api/rates')
		.then(response => {
			var list = response.data;
			list.forEach(function(item){
				if(item.code == 'USD'){
					var price = amount * item.rate;
					result(price.toFixed(2));
				}
			});
		})
		.catch(error => {
			console.log(error);
            result(null);
		});
};

Bitcoin.toBitcoin = function(amount, result) {
    axios.get('https://bitpay.com/api/rates')
		.then(response => {
			var list = response.data;
			list.forEach(function(item){
				if(item.code == 'USD'){
					var price = amount / item.rate;
					result(null, price.toFixed(8));
				}
			});
		})
		.catch(error => {
			console.log(error);
            result(error, null);
		});
};

module.exports = Bitcoin;