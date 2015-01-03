var express = require('express');
var path = require('path');

var ejs = require('ejs');
var fs = require('fs');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var app = express();
var http = require('http').Server(app);
var mongoose = require('mongoose');
var io = require('socket.io')(http);

rootKey ={}
//configure the app
app.set('port', process.env.PORT || 3000);
app.use(express.cookieParser('dandroid'));
app.use(express.session({secret: 'cookie_secret'}));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(passport.initialize());
app.use(passport.session());

//host https://mongolab.com
mongoose.connect('mongodb://dani:dani@ds027491.mongolab.com:27491/beefdatabase')


//user model in user.js
var UserDetails = require(path.join(__dirname, './models/user.js'))(mongoose);

//penzfelvetel model in penzfelvetel.js
var Penzfelvetel = require(path.join(__dirname, './models/penzfelvetel.js'))(mongoose);

//egyenlites model in penzfelvetel.js
var Egyenlites = require(path.join(__dirname, './models/egyenlites.js'))(mongoose);

//authentication in auth.js
require(path.join(__dirname, './auth.js'))(passport, LocalStrategy, UserDetails);

//routing in routes.js
require(path.join(__dirname, './routes/routes.js'))(app,passport,UserDetails,Penzfelvetel,Egyenlites,rootKey,io);


//create server
http.listen(app.get('port'), function () {
	console.log('Express server listening on localhost:' + app.get('port'));
});
