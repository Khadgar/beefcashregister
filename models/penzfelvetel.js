var mongoose = require('mongoose');

module.exports = function(mongoose) {
var Schema = mongoose.Schema;
var Penzfelvetel = new Schema({
		targetuser : String,
		mikor      : String,
		mennyit    : [Number],
		mire	   : [String]
	}, {
		collection : 'penzfelvetel'
	});
	
	var model= mongoose.model('penzfelvetel', Penzfelvetel);

return model;
}