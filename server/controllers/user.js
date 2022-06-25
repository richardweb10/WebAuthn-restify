const User = require('../models/user');
const base64url = require('base64url');
const { 
	randomBase64URLBuffer, 
	serverMakeCred, 
	serverGetAssertion, 
	verifyAuthenticatorAttestationResponse, 
	verifyAuthenticatorAssertionResponse 
} = require('../helpers');

const {
	// Registration
	generateRegistrationOptions,
	verifyRegistrationResponse,
	// Authentication
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
  } = require('@simplewebauthn/server');


function respond(req, res, next) {
	console.log("hello")
	res.send('hello ' + req.params.name);
	next();
  }

let expectedOrigin = `http://localhost:3000`;

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
					name: email,
					email,
					devices: [],
				});
			
				const opts = {
					rpName: 'Richard WebAuthn',
					rpID: 'localhost',
					userID: user.id ,
					userName: user.name,
					timeout: 60000,
					attestationType: 'direct',
					/**
					 * Passing in a user's list of already-registered authenticator IDs here prevents users from
					 * registering the same device multiple times. The authenticator will simply throw an error in
					 * the browser if it's asked to perform registration when one of these ID's already resides
					 * on it.
					 */
					excludeCredentials: user.devices.map(dev => ({
					  id: dev.credentialID,
					  type: 'public-key',
					  transports: dev.transports,
					})),
					/**
					 * The optional authenticatorSelection property allows for specifying more constraints around
					 * the types of authenticators that users to can use for registration
					 */
					authenticatorSelection: {
					  userVerification: 'required',
					},
					/**
					 * Support the two most common algorithms: ES256, and RS256
					 */
					supportedAlgorithmIDs: [-7, -257],
				  };
				
				  const options = generateRegistrationOptions(opts);

				  const data = { 
					challenge: options.challenge,
					email
				}

				  session.save(req.session.sid, data, function(err, status){
					if(err) {
						console.log("Session data cannot be saved");
						return;
					}        
					console.log("status-" + status + data.challenge); //debug code
				});
				
				  /**
				   * The server needs to temporarily remember this value for verification, so don't lose it until
				   * after you verify an authenticator response.
				   */
				
				  res.json( {options , sid: req.session.sid, status : 'ok'});


			}
			next();
	}
	);

	server.post('/webauthn/response-register', async (req, res, next) => {

		const {makeCred, sid} = req.body;

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

		  const expectedChallenge = challenge;
		  let user = await User.findOne({ email });

	let verification;
	try {
		const opts= {
		  credential: JSON.parse(makeCred),
		  expectedChallenge: `${expectedChallenge}`,
		  expectedOrigin,
		  expectedRPID: 'localhost',
		  requireUserVerification: true,
		};

		verification = await verifyRegistrationResponse(opts);
	  } catch (error) {
		return res.json({
			'status': 'failed',
			'message': error
		});
	  }

	  const { verified, registrationInfo } = verification;

	  if (verified && registrationInfo) {
		const { credentialPublicKey, credentialID, counter } = registrationInfo;
	
		const existingDevice = user.devices.find(device => device.credentialID === credentialID);
	
		if (!existingDevice) {
		  /**
		   * Add the returned device to the user's list of devices
		   */
		  const newDevice = {
			credentialPublicKey: base64url.encode(credentialPublicKey),
			credentialID: base64url.encode(credentialID),
			counter,
			transports: JSON.parse(makeCred).transports,
		  };
		  user.devices.push(newDevice);
		  user.save();
		}
	  }

	  res.json({ 'status': 'ok', 'sid': req.session.sid , verified});
	
	  next();

	});
	
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
		}else {

			const opts = {
				timeout: 60000,
				allowCredentials: user.devices.map(dev => ({
				  id: base64url.toBuffer(dev.credentialID),
				  type: 'public-key',
				  transports: dev.transports ?? ['usb', 'ble', 'nfc', 'internal'],
				})),
				userVerification: 'required',
				rpID: 'localhost',
			  };

			const options = generateAuthenticationOptions(opts);

			const data = { 
				challenge: options.challenge,
				email
			}
			session.save(req.session.sid, data, function(err, status){
				if(err) {
					console.log("Session data cannot be saved");
					return;
				}        
				console.log("status-" + status + data.challenge); //debug code
			});
				
			res.json({options , sid: req.session.sid, status : 'ok'});
			
		}
		next()
	});
	
	server.post('/webauthn/response-login', async (req, res, next) => {
		const {asseResp, sid} = req.body;

		console.log("asseResp: ", asseResp)
		
		
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
		
		let user = await User.findOne({ email });

		const expectedChallenge = challenge;

		let dbAuthenticator;
		const bodyCredIDBuffer = base64url.toBuffer(asseResp.rawId);

		for (const dev of user.devices) {
			if (base64url.toBuffer(dev.credentialID).equals(bodyCredIDBuffer)) {
			  dbAuthenticator = dev;
			  break;
			}
		  }

		  if (!dbAuthenticator) {
			throw new Error(`could not find authenticator matching ${asseResp.id}`);
		  }

		  let verification;

		  dbAuthenticator.credentialPublicKey = base64url.toBuffer(dbAuthenticator.credentialPublicKey)
		  dbAuthenticator.credentialID = base64url.toBuffer(dbAuthenticator.credentialID)

		  try {
			const opts = {
			  credential: asseResp,
			  expectedChallenge: `${expectedChallenge}`,
			  expectedOrigin,
			  expectedRPID: 'localhost',
			  authenticator: dbAuthenticator,
			  requireUserVerification: true,
			};
			console.log("opts-reslogin: ", opts)
			verification = await verifyAuthenticationResponse(opts);
		  } catch (error) {
			res.status(400);
			res.send(error);	
		  }

		  console.log("verification: ", verification)

		  const { verified, authenticationInfo } = verification;

		  if (verified) {
			// Update the authenticator's counter in the DB to the newest count in the authentication
			dbAuthenticator.counter = authenticationInfo.newCounter;

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
		  }
				
		res.json({ 'status': 'ok', 'sid': req.session.sid, verified });
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
