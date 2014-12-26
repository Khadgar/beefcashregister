var mongoose = require('mongoose');

module.exports = function(mongoose) {
var Schema = mongoose.Schema;
var UserDetail = new Schema({
		username : String,
		password : String,
		fullname : String,
		role	 : String
	}, {
		collection : 'users'
	});
	
	var model= mongoose.model('users', UserDetail);

return model;
}