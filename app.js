var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socket_io = require('socket.io');

var mongo = require('mongodb');
var monk = require('monk');

var app = express();

// socket.io
var io = socket_io();
app.set('io', io);

// Setup DB and make our db accessible to our router
var db = monk(process.env.MONGODB_URI);
db.then(() => {
    console.log("Successfully connected to database");
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
app.set('db', db);
app.use(function(req, res, next){
    req.db = db;
    next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/static/stylesheets', require('node-sass-middleware')({
    src: path.join(__dirname, 'public/stylesheets'),
    sourceMap: true
}));
app.use('/static', express.static(path.join(__dirname, 'public')));

// routes
var start = require('./routes/start'); // create new game form (index)
var newgame = require('./routes/newgame'); // redirects to game, coming from new game form
var game = require('./routes/game'); // the actual game interface
var ioroutes = require('./routes/io')(app, db, io); // socket.io handlers

app.use('/', start);
app.use('/new-game', newgame);
app.use('/game', game);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
