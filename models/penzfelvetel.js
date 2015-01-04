var mongoose = require('mongoose');

module.exports = function(mongoose) {
var Schema = mongoose.Schema;
var Penzfelvetel = new Schema({
		targetuser 		    : String,
		targetuser_fullname : String,
		mikor               : String,
		mennyit    			: Number,
		summa	  			: Number
	}, {
		collection : 'penzfelvetel'
	});
	
	var model= mongoose.model('penzfelvetel', Penzfelvetel);

return model;
}