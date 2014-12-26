module.exports = function(passport, LocalStrategy, UserDetails){

	passport.use(new LocalStrategy(
			function (username, password, done) {
			process.nextTick(function () {
				UserDetails.findOne({
					'username' : username
				},
					function (err, user) {
					if (err) {
						console.log('Error');
						return done(err);
					}
					if (!user) {
						return done(null, false);
					}
					if (user.username != username) {
						console.log('Error in username');
						return done(null, false);
					}
					if (user.password != password) {
						console.log('Error in password');
						return done(null, false);
					}

					return done(null, user);

				});
			});
		}));

	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function (id, done) {
		UserDetails.findById(id, function (err, user) {
			done(err, user);
		});
	});
	
}