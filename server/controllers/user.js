const User = require('../models/user');
const base64url = require('base64url');
const { 
	randomBase64URLBuffer, 
	serverMakeCred, 
	serverGetAssertion, 
	verifyAuthenticatorAttestationResponse, 
	verifyAuthenticatorAssertionResponse 
} = require('../helpers');


function respond(req, res, next) {
	console.log("hello")
	res.send('hello ' + req.params.name);
	next();
  }

function Users(server, session){

	server.post('/webauthn/hello/:name', respond);
		
	server.post('/webauthn/register', async (req, res, next) => {
		const { email } = req.body;
			if (!email){
				res.status(400);
				res.send('Missing email field');
			}
		
			const findUser = await User.findOne({ email });
		
			if (findUser){
				res.status(400);
				res.send('User already exists');
			}
			else {
				const user = await User.create({
					id: randomBase64URLBuffer(8),
					name: email.split('@')[0],
					email,
				});
			
				let makeCredChallenge = serverMakeCred(user.id, user.email);
				makeCredChallenge.status = 'ok';
				const data = { 
					challenge: makeCredChallenge.challenge,
					email
				}
				session.save(req.session.sid, data, function(err, status){
					if(err) {
						console.log("Session data cannot be saved");
						return;
					}        
					console.log("status-" + status + data.challenge); //debug code
				});
					
				res.send({makeCredChallenge , sid: req.session.sid});
			}
			next();
	}
	);
	
	server.post('/webauthn/registerfail', async(req, res, next) => {
		const { email } = req.body;
		if (!email){
			res.status(400);
			res.send('Missing email field');	
		}
	
		await User.deleteOne({ email });
		res.status(200);
		res.send('Deleted');	
		next();
	});
	
	server.post('/webauthn/login', async (req, res, next) => {
		const { email } = req.body;
	
		if (!email){
			res.status(400);
			res.send('Missing email field');	
		}
	
		const user = await User.findOne({ email });
	
		if (!user){
			res.status(400);
			res.send('User does not exist');	
		}
	
		else {
			let getAssertion = serverGetAssertion(user.authenticators);
			getAssertion.status = 'ok';

			const data = { 
				challenge: getAssertion.challenge,
				email
			}
			session.save(req.session.sid, data, function(err, status){
				if(err) {
					console.log("Session data cannot be saved");
					return;
				}        
				console.log("status-" + status + data.challenge); //debug code
			});
				
			res.send({getAssertion , sid: req.session.sid});
			
		}
		next()
	});
	
	server.post('/webauthn/response', async (req, res, next) => {
		const {makeCred, sid} = req.body;
		
		console.log("req.session.challenge: ",req.session.challenge);
		if (
			!makeCred ||
			!makeCred.id ||
			!makeCred.rawId ||
			!makeCred.response ||
			!makeCred.type ||
			makeCred.type !== 'public-key'
		){
			res.json({
				status: 'failed',
				message: 'Response missing one or more of id/rawId/response/type fields, or type is not public-key!',
			});
		}
		let {challenge, email} = await new Promise((resolve, reject) => {
			session.load(sid,function(err,data){
				if(err) {
					res.writeHead(440, 'Login Time Out', {'Content-Type': 'application/json'});
					res.end("{'Status': 'Error', 'Message': 'Session expired or does not exist'}");
					return;
				}
				console.log("data-session-load: ", data);
				resolve(data);
					 
			 });
		  });
		
		const webAuthnResp = makeCred;
		console.log("webAuthnResp: ", webAuthnResp);
		const clientData = JSON.parse(base64url.decode(webAuthnResp.response.clientDataJSON));
		

		if(clientData.challenge !== challenge) {
			res.json({
				'status': 'failed',
				'message': 'Challenges don\'t match!'
			});
		}
		let result;
		let user = await User.findOne({ email });
		if(webAuthnResp.response.attestationObject !== undefined) {
			/* This is create cred */
			console.log("webAuthnResp: ", webAuthnResp);
			result = await verifyAuthenticatorAttestationResponse(webAuthnResp);
	
			if(result.verified) {
				user.authenticators.push(result.authrInfo);
				user.registered = true;
				user.save();
			}
		} else if(webAuthnResp.response.authenticatorData !== undefined) {
			/* This is get assertion */
			result = await verifyAuthenticatorAssertionResponse(webAuthnResp, user.authenticators);
		} else {
			res.json({
				'status': 'failed',
				'message': 'Can not determine type of response!'
			});
		}
		if(result.verified) {
			const data = {
				loggedIn: true,
				email
			}
			session.save(req.session.sid, data, function(err, status){
				if(err) {
					console.log("Session data cannot be saved");
					return;
				}        
				console.log("status-" + status + data.loggedIn); //debug code
			});
			res.json({ 'status': 'ok', 'sid': req.session.sid });
		} else {
			res.json({
				'status': 'failed',
				'message': 'Can not authenticate signature!'
			});
		}
		next();
	});
	
	server.get('/webauthn/profile/:sid', async(req, res, next) => {

		const {sid} = req.params;
		console.log("req.query: ", req.query)
		console.log("req.body: ", req.body)
		let {loggedIn, email} = await new Promise((resolve, reject) => {
			session.load(sid,function(err,data){
				if(err) {
					res.writeHead(440, 'Login Time Out', {'Content-Type': 'application/json'});
					res.end("{'Status': 'Error', 'Message': 'Session expired or does not exist'}");
					return;
				}
				console.log("data-session-load: ", data);
				resolve(data);
					 
			 });
		  });

		if(!loggedIn){
			res.status(401);
			res.send('Denied!');	
		}
		
		const user = await User.findOne({ email } );
	
		res.json(user);
		next();
		
	});
	
	server.get('/webauthn/logout', (req, res, next) => {
		req.session = null;
		res.send('Logged out');
		next();
	});

}




module.exports = Users;
