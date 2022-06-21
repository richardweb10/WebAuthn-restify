var restify = require('restify');
const cookieSession = require('cookie-session');
const { randomHex32String } = require('./helpers');
const userRouter = require('./controllers/user');
const cookieParser = require('cookie-parser');
//const cors = require('cors');
const corsMiddleware = require('restify-cors-middleware')
var CookieParser = require('restify-cookies');
const session = require('restify-cookie-session')({
  debug : true,
  ttl   : 60
});


function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

const cors = corsMiddleware({
  preflightMaxAge: 5, //Optional
  origins: ['*'],
  allowHeaders: ['*'],
  exposeHeaders: ['*']
})


var server = restify.createServer();



/*server.use(cookieSession({
	name: 'seesion',
	keys: [randomHex32String()],
	maxAge: 24*60*60*1000
}));*/
server.use(CookieParser.parse);
server.use(session.sessionManager);

//server.use(cookieParser());
server.pre(cors.preflight)
server.use(cors.actual)
server.use(restify.plugins.bodyParser());
require('./controllers/user')(server, session);

//server.get('/hello/:name', respond);
//server.head('/hello/:name', respond);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});