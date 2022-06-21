# verifik-backend-test
Verifik Backend test - May 2022

# Instructions 

Verifik is leading the innovation in passwordless logins and authentication using real and verified information, that's why we created email, phone, biometric passwordless logins but we are trying to build another passwordless login alternative and in this test we require you to develop an end to end solution that covers the minimal actions described in the following statements.

The solution must include:

1. A simple API using Restify.js (this is the framework we are using at the moment)
2. Utilize the openSource library for WebAuthN (You have to code the Cross platform and the Platform (TPM) solution )
3. a simple login and registration form using WebAuthN (You can use any frontend framework or plain JavaScript)
4. To Store the users you can use any DB (we utilize MongoDB in Verifik)

Remember that the authentication has to be verified by the server which provides the `challenge`, the test would be incomplete if the backend don't confirm the validity of the response and everything is on the frontend.


Bonus points:
1. Create a docker container with the solution specified
2. Create documentation including how to run the docker container, how to register and login, and how WebAuthN works with the API

## Ejecutar 

Paso 1: Ejecutar el servidor desde la raiz del proyecto con "npm start"

Paso 2: Ejecutar el frontend desde la carpeta frontend con "npm start"


## Passwordless logins to pick

### WebAuthN

https://webauthn.io/

<img width="1211" alt="image" src="https://user-images.githubusercontent.com/72091352/167236754-33116196-d17d-4bf1-add0-29ce5e0e3a2e.png">

<img width="1079" alt="image" src="https://user-images.githubusercontent.com/72091352/167236832-751d2b6d-a200-45d0-a5d4-4dd8b3ce2f12.png">

<img width="1175" alt="image" src="https://user-images.githubusercontent.com/72091352/167236858-60441edf-35c6-4f8e-8a67-2e8e7c1af29b.png">


