var path = require('path');
var ejs = require('ejs');
var fs = require('fs');

module.exports = function (app, passport, UserDetails,Penzfelvetel, io) {

	var profilecontent = fs.readFileSync(path.join(__dirname, '../views/profile.html'), 'utf-8');
	var profilecompiled = ejs.compile(profilecontent);

	var admincontent = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf-8');
	var admincompiled = ejs.compile(admincontent);

	var errorcontent = fs.readFileSync(path.join(__dirname, '../views/error.html'), 'utf-8');
	var errorcompiled = ejs.compile(errorcontent);

	var indexcontent = fs.readFileSync(path.join(__dirname, '../views/index.html'), 'utf-8');
	var indexcompiled = ejs.compile(indexcontent);
	
	var penzfelvetelcontent = fs.readFileSync(path.join(__dirname, '../views/penzfelvetel.html'), 'utf-8');
	var penzfelvetelcompiled = ejs.compile(penzfelvetelcontent);

	app.get('/login', function (req, res) {
		console.log("login.html");

		res.sendfile(path.join(__dirname, '../views/index.html'));

	});

	app.post('/login',
		passport.authenticate('local', {
			successRedirect : '/loginSuccess',
			failureRedirect : '/loginFailure'
		}));

	app.post('/signup', function (req, res) {

		UserDetails.findOne({
			'username' : req.body.username
		}, function (err, user) {
			if (user) {
				res.writeHead(200, {
					'Content-Type' : 'text/html'
				});
				res.end(errorcompiled({
						errormsg : 'Username exists!'
					}));
			} else {

				if (req.body.username != '' && req.body.password != '') {
					var newuserdate = {
						username : req.body.username,
						password : req.body.password,
						fullname : req.body.fullname,
						role : req.body.role
					};
					var user = new UserDetails(newuserdate);

					user.save(function (error, data) {
						if (error) {
							res.json(error);
						} else {
							res.redirect('/admin');
						}
					});
				} else {
					res.writeHead(200, {
						'Content-Type' : 'text/html'
					});
					res.end(errorcompiled({
							errormsg : 'You have to fill username and password fields!'
						}));
				}

			}
		});

	});
	
	

	io.on('connection', function (socket) {
		console.log('a user connected');
		
		socket.on('message', function (msg) {
			console.log('message: ' + msg);
				UserDetails.find({})
				.select('username fullname')
				.exec(function(err, users) {
						console.log(users);
						//socket.emit csak a kuldonek valaszol. io.emit valaszol mindenkinek.
						socket.emit('users',users)
				});
		});

		socket.on('tartozasok', function (msg) {
			console.log('message: ' + msg);
				Penzfelvetel.find({'targetuser': msg})
				.select('targetuser summa')
				.exec(function(err, tartozas) {
						console.log(tartozas);
						//a tartozasok osszegzese egy listaba
						var sum = []
						for(var i=0;i<tartozas.length;i++){
							sum = sum.concat(tartozas[i]['summa'])
						}	
						//egy userhez tartozo osszes tartozas tovabbkuldese
						socket.emit('tartozas',sum)
				});
		});	
		

		

		socket.on('disconnect', function () {
			console.log('user disconnected');
		});
	});


	var isAuthenticated = function (req, res, next) {
		if (req.isAuthenticated())
			return next();
		console.log(req.user);
		res.redirect('/login');
	}

	app.get('/', isAuthenticated, function (req, res, next) {
		res.writeHead(200, {
			'Content-Type' : 'text/html'
		});
		res.end(profilecompiled({
				username : req.user.fullname
			}));
	});

	app.get('/personal', isAuthenticated, function (req, res, next) {
		UserDetails.findOne({
			username : req.user.username
		}, function (error, user) {
					res.writeHead(200, {
			'Content-Type' : 'text/html'
		});
		res.end(profilecompiled({
				username : user.fullname
			}));
		});
		
		var d;

		
		console.log('adat: '+d);
		//valahogy csak annak a kliensnek kellene kuldeni aki kérte az adatot. más abbol ne kapjon semmit.
		
		var id;
		io.sockets.on('connection', function(socket) {
		  socket.on('i_am_personal_page', function(data) {
		  id = socket.id;
		  getResult(function (data) {
			
			console.log("post: " + data);
			});
	
			console.log('message: ' + data);

			
		  });
		  
		socket.on('disconnect', function () {
			console.log('user disconnected');
		});
		});

	});
		
	function getResult(callback) {
		
		Penzfelvetel.find({targetuser:req.user.username})
		.select('targetuser mikor')
		.exec(function(err, d) {
		callback(d)
		});	
	};
	
	
	app.get('/penzfelvetel', isAuthenticated, function (req, res, next) {
		process.nextTick(function () {
			UserDetails.findOne({
				username : req.user.username
			}, function (error, user) {
				console.log(user.role)
				//json string double quoted
				if (user.role == "on") {
					res.writeHead(200, {
						'Content-Type' : 'text/html'
					});
					res.end(penzfelvetelcompiled({
							username : user.fullname
						}));
				} else {
					res.writeHead(200, {
						'Content-Type' : 'text/html'
					});
					res.end(errorcompiled({
							errormsg : 'Nincs adminisztrátor jog!'
						}));
				}
			});
		});
	});
	
	app.post('/settartozas', function (req, res) {
		console.log(req.body)
		var total = 0;
		if (Array.isArray(req.body.mennyit)){
			var osszeg = req.body.mennyit;
		}else{
			var osszeg = [req.body.mennyit];
		}
		if (Array.isArray(req.body.mire)){
			var jogcim = req.body.mire;
		}else{
			var jogcim = [req.body.mire];
		}
		
		osszeg = osszeg.filter(Number)
		jogcim = jogcim.filter(function(e){return e}); 
		console.log(osszeg);
		var teljesitve = new Array(osszeg.length);
		for(var i=0;i<teljesitve.length;i++){
		  teljesitve[i]=0;
		}
		for(var i in osszeg) { total += parseInt(osszeg[i]); }
		var tartozas = {
			targetuser : req.body.username,
			mikor      : req.body.date,
			mennyit    : osszeg,
			mire       : jogcim,
			teljesites : teljesitve,
			summa	   : total
		};
		var ujtartozas = new Penzfelvetel(tartozas);
		ujtartozas.save()

		res.redirect('/penzfelvetel');

	});
	
	
	app.get('/penzelszamolas', isAuthenticated, function (req, res, next) {
	
		UserDetails.findOne({
			username : req.user.username
		}, function (error, user) {
					res.writeHead(200, {
			'Content-Type' : 'text/html'
		});
		res.end(profilecompiled({
				username : user.fullname
			}));
		});
	});
	

	app.get('/loginFailure', function (req, res, next) {
		res.redirect('/');
	});

	app.get('/loginSuccess', function (req, res, next) {
		res.redirect('/personal');
	});

	app.get('/admin', isAuthenticated, function (req, res, next) {

		process.nextTick(function () {
			UserDetails.findOne({
				username : req.user.username
			}, function (error, user) {
				console.log(user.role)
				//json string double quoted
				if (user.role == "on") {
					res.writeHead(200, {
						'Content-Type' : 'text/html'
					});
					res.end(admincompiled({
							username : user.fullname
						}));
				} else {
					res.writeHead(200, {
						'Content-Type' : 'text/html'
					});
					res.end(errorcompiled({
							errormsg : 'Nincs adminisztrátor jog!'
						}));
				}
			});
		});

	});
	
	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

};