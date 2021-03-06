import './App.css';
import React, { useState, useEffect } from 'react';
import { Grid, Button, Message, Form, Segment, Header } from 'semantic-ui-react';
import { getGetAssertionChallenge, getMakeCredentialsChallenge, 
	sendWebAuthnResponse, getProfile, logout,
	 registerFail, sendWebAuthnResponseRegister,
	 sendWebAuthnResponseLogin } from './webauthn';
import { preformatGetAssertReq, preformatMakeCredReq, publicKeyCredentialToJSON } from './helpers';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

function App() {
	const [errMsg, setErrMsg] = useState('');
	const [email, setEmail ] = useState('');
	const [successMsg, setSuccessMsg] = useState('');
	const [loggedIn, setLoggedIn] = useState(false);
	const [sid, setSid] = useState('');
	const [profileData, setProfileData] = useState(null);

	const handleUsernameChange = (e) => {
		setEmail(e.target.value);
	};

	const handleRegister = async () => {
		getMakeCredentialsChallenge({email})
			.then( async (response) => {

				const opts = response.options;

				const attResp = await startRegistration(opts);
				return { 
					attResp, 
					sid: response.sid };
				})
			.then((response) => {
				return sendWebAuthnResponseRegister({
					makeCred: JSON.stringify(response.attResp),
					sid: response.sid	
				}
				)
			})
			.then((response) => {
				if(response.status === 'ok'){
					setErrMsg('');
					setSuccessMsg('You can now try logging in');
				}
				else
					setErrMsg(response.message);
			})
			.catch(err => {
				registerFail({email})
					.then(() => {
						if(err.response)
							setErrMsg(err.response.data);
						else
							console.log(err);
					});
			});
	};

	const handleLogin = async () => {
		getGetAssertionChallenge({email})
			.then( async (response) => {

				const opts = response.options;

				console.log("opts: ", opts)

				const asseResp = await startAuthentication(opts);
				console.log("asseResp: ", asseResp)
				return { 
					asseResp, 
					sid: response.sid };
			})
			.then((response) => {

				return sendWebAuthnResponseLogin({
					asseResp: response.asseResp,
					sid: response.sid	
				});
			})
			.then((response) => {
				if(response.status === 'ok') {
					setSid(response.sid);
					localStorage.setItem('loggedIn', true);
					setLoggedIn(true);
					setEmail('');
					setSuccessMsg('');
					setErrMsg('');
				} else {
					setSuccessMsg('');
					setErrMsg(response.message);
				}
			})
			.catch(err => {
				if(err.response)
					setErrMsg(err.response.data);
				else
					console.log(err);
			});
	};
	const handleLogout = () => {
		setEmail('');
		logout().then(() => {
			localStorage.removeItem('loggedIn');
			setLoggedIn(false);
			setProfileData(null);
		});
	};

	useEffect(() => {;
		if(localStorage.getItem('loggedIn'))
			setLoggedIn(true);
		if(loggedIn)
			getProfile({sid})
				.then(data => {
					setProfileData(data);
				})
				.catch(err => {
					setErrMsg(err.response.data);
					localStorage.removeItem('loggedIn');
				});
	}, [loggedIn]);

	return (
		<div className='App-header'>
			<Grid container textAlign='center' verticalAlign='middle'>
				<Grid.Column style={{ maxWidth: 450, minWidth: 300 }}>
					<Header as='h2' textAlign='center' style={{ color: 'white'}}>
						WebAuthn - Richard Technical test
					</Header>
					{!loggedIn ?
						<Form size='large'>
							{errMsg && <Message negative icon='warning sign' size='mini' header={errMsg}/>}
							{successMsg && <Message positive icon='thumbs up' size='mini' header={successMsg}/>}
							<Segment>
								<Form.Input 
									fluid
									icon='user'
									iconPosition='left'
									placeholder='Username'
									onChange={handleUsernameChange}
								/>
								<Button 
									fluid 
									size='large' 
									onClick={handleRegister} 
									style={{ 
										marginTop: 8,
										color: 'white',
										backgroundColor: '#19857b'
									}}
									disabled={!email}
								>
									Register
								</Button>
								<Button 
									fluid 
									size='large'
									onClick={handleLogin} 
									style={{ 
										marginTop: 8,
										color: 'white',
										backgroundColor: '#19857b'
									}}
									disabled={!email}
								>
									Login
								</Button>
							</Segment>
						</Form>
						:
						<Segment style={{ overflowWrap: 'break-word'}}>
							{profileData &&
								<>
									<Header as='h3' textAlign='center'>
										Hi {profileData.name}
									</Header>
									<Header as='h4' textAlign='center'>
										Your profile information
									</Header>
									<strong>ID: </strong>{profileData.id}
									<br/>
									<strong>Credential information:</strong>
									<br/>
									<strong>Public key: </strong>
									<br/>
									<div style={{
										maxWidth: 300,
										overflowWrap: 'break-word',
										marginLeft: '25%',
										marginRight: '25%'
									}}>
										{profileData.devices[0].credentialPublicKey
}
									</div>
									
								</>
							}
						</Segment>
					}
				</Grid.Column>
			</Grid>
		</div>
	);
}

export default App;
