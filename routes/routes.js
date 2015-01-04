var path = require('path');
var ejs = require('ejs');
var fs = require('fs');
var PDFDocument = require('pdfkit');

module.exports = function (app, passport, UserDetails,Penzfelvetel,Egyenlites,rootKey, io) {

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
		console.log(req.user.username + ' megnyitotta az oldalt');
		console.log(rootKey);
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
		
		io.on('connection', function (socket) {
			console.log('a user connected - profile');
			rootKey[socket.id] = req.user.username;
			
			socket.on('tarozasaim', function (msg) {
			for (var id in rootKey) {
				if(rootKey[id]==req.user.username){
					process.nextTick(function () {
						Penzfelvetel.find({targetuser:rootKey[id]})
						.select('targetuser mikor summa')
						.exec(function(err, d) {
						console.log('cimzett: '+ id+' - '+rootKey[id]+' adat: '+ d)
						io.to(id).emit('tarozasaid', d);
						delete d;
						});
					});
					
				}
			}
			
		});
		
			
		socket.on('disconnect', function() {
			delete rootKey[socket.id]
		});
	});
	
	
	
	
	});

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
			
			io.on('connection', function (socket) {
			console.log('a user connected');
			console.log(io.sockets.connected);
			socket.on('message', function (msg) {
				console.log('message: ' + msg);
					UserDetails.find({})
					.select('username fullname')
					.exec(function(err, users) {
							console.log(users);
							//socket.emit csak a kuldonek valaszol. io.emit valaszol mindenkinek.
							socket.emit('users',users)
							delete users;
					});
			});

			socket.on('tartozasok', function (msg) {
				console.log('message: ' + msg);
				
				process.nextTick(function () {
					Penzfelvetel.find({ 'targetuser': msg }).where('summa').gt(0).exec(function(err, tartozas) {
					socket.emit('tartozas',tartozas.length)
					});
				});	
			
			});	
			
				socket.on('disconnect', function() {
				});
			});
		});
		
	});
	
	app.post('/settartozas', function (req, res) {
		
		if(req.body.osszeg==''){
			var osszeg='0';
		}else{
			var osszeg = req.body.mennyit;
		}
		
		var total = osszeg;
		
		UserDetails.find({username:req.body.username}).select('fullname').exec(function(err, userfullname) {
		
			var tartozas = {
				targetuser 			: req.body.username,
				targetuser_fullname	: userfullname[0]['fullname'],
				mikor     			: req.body.date,
				mennyit    			: osszeg,
				summa	   			: total
			};
			
			var ujtartozas = new Penzfelvetel(tartozas);
			ujtartozas.save()
		
		});

		res.redirect('/penzfelvetel');
	});
	
	
	app.post('/egyenlites', function (req, res) {
		console.log(req.body)
		process.nextTick(function () {
				Egyenlites.findOne({
					tartozas_id : req.body.tartozas_id
				}, function (error, egyenlit) {
					if(!egyenlit){
						var egyenlites = {
							tartozas_id : req.body.tartozas_id,
							username    : req.user.username,
							szamlaszam  : req.body.szamlaszam,
							cegnev      : req.body.kiallito,
							osszeg      : req.body.osszeg,
							megjegyzes  : req.body.megjegyzes,
							teljesitve  : 0,
							datum       : req.body.date
						};
							var tetel = new Egyenlites(egyenlites);
							tetel.save();
							
						process.nextTick(function () {
							Penzfelvetel.findOne({
								_id : req.body.tartozas_id
							}, function (error, tartozas) {
							
							if (Array.isArray(req.body.osszeg)){
								var osszeg = req.body.osszeg;
							}else{
								var osszeg = [req.body.osszeg];
							}
							var total = 0;
							for(var i in osszeg) { total += parseInt(osszeg[i]); }
								tartozas.summa -= total;
								if(tartozas.summa<=0){
									tetel.teljesitve = 1;
									tetel.save();
								}
								tartozas.save();
							});
						});
					
					}else{
					//kiboviti a mar beszurt elemet
						if (Array.isArray(req.body.szamlaszam)){
							for (var i=0; i < req.body.szamlaszam.length; i++){
								egyenlit.szamlaszam.push(req.body.szamlaszam[i])
							}
						}else{
							egyenlit.szamlaszam.push(req.body.szamlaszam)
						}
						if (Array.isArray(req.body.kiallito)){
							for (var i=0; i < req.body.kiallito.length; i++){
							egyenlit.cegnev.push(req.body.kiallito[i])
							}
						}else{
							egyenlit.cegnev.push(req.body.kiallito)
						}
						if (Array.isArray(req.body.osszeg)){
							for (var i=0; i < req.body.osszeg.length; i++){
								egyenlit.osszeg.push(req.body.osszeg[i])
							}						
						}else{
							egyenlit.osszeg.push(req.body.osszeg)
						}
						if (Array.isArray(req.body.megjegyzes)){
							for (var i=0; i < req.body.megjegyzes.length; i++){
								egyenlit.megjegyzes.push(req.body.megjegyzes[i])
							}						
						}else{
							egyenlit.megjegyzes.push(req.body.megjegyzes)
						}
						if (Array.isArray(req.body.date)){
							for (var i=0; i < req.body.date.length; i++){
								egyenlit.datum.push(req.body.date[i])
							}
						}else{
							egyenlit.datum.push(req.body.date)
						}
						
						
						process.nextTick(function () {
							Penzfelvetel.findOne({
								_id : req.body.tartozas_id
							}, function (error, tartozas) {
							
							//Bejovo NaN ertek ellenorzese. Ha nan jon be akkor 0
							console.log('req.body.osszeg - '+req.body.osszeg)
							if(req.body.osszeg==''){
								var osszeg='0';
							}else{ 
								if (Array.isArray(req.body.osszeg)){
									var osszeg = req.body.osszeg;
								}else{
									var osszeg = [req.body.osszeg];
								}
							}
							var total = 0;
							for(var i in osszeg) { total += parseInt(osszeg[i]); }
								tartozas.summa -= total;
								if(tartozas.summa<=0){
									egyenlit.teljesitve = 1;
									egyenlit.save();
								}
								tartozas.save();
							});
						});	
						
						
						egyenlit.save();

					}
					
				});
		});
		res.redirect('/personal');
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
	
	app.get('/kiktartoznak', function (req, res) {
		//itt kellene a PDF letrehozast megcsinalni
		

		Penzfelvetel.find({}).where('summa').gt(0).exec(function(err, users) {
			console.log(users);
			var szoveg='';
			doc = new PDFDocument();
			doc.pipe( fs.createWriteStream(path.join(__dirname,'kiktartoznak.pdf')) );

			for(var i=0;i<users.length;i++){
				szoveg+='Név: '+users[i]['targetuser_fullname']+' Tartozása: '+users[i]['summa']+'\n';
			}

			console.log(szoveg);
				
			doc.fillColor('black').font('Helvetica', 20)
			.text('BeefFarmer tartozások lista', { align: 'center' })
		    .moveDown();
			
			doc.fillColor('black')
			   .text(szoveg, {
				   paragraphGap: 10,
				   align: 'justify',
			   });
			doc.end();
			
			
		});
		



		
		res.download(path.join(__dirname,'kiktartoznak.pdf'));
		
	});
	
	
	
	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

};