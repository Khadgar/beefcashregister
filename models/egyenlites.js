var mongoose = require('mongoose');

module.exports = function(mongoose) {
var Schema = mongoose.Schema;
var Egyenlites = new Schema({
		tartozas_id      :  String,
		username		 :  String,
		szamlaszam       : [String],
		cegnev           : [String],
		osszeg	         : [Number],
		megjegyzes       : [String],
		teljesitve		 : 	Number,
		datum	         : [String]
	}, {
		collection : 'egyenlites'
	});
	
	var model= mongoose.model('egyenlites', Egyenlites);

return model;
}