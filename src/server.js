/**
 * Created by macdja38 on 2017-01-19.
 */
let express = require('express');
let bodyParser = require('body-parser');
let app = express();
let cookie = require("cookie-parser");
let passport = require("passport");
let logger = require('morgan');
var multer = require('multer');
let PDFParser = require("pdf2json");

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now());
  }
});
var upload = multer({storage: storage}).single('resumes');
var bool = false;
let LocalStrategy = require('passport-local').Strategy;

let session = require('express-session');
let RDBStore = new (require('session-rethinkdb'))(session);
let R = require("rethinkdbdash");
let r = new R({servers: {host: 'localhost', db: 'immm', port: 28015}});

r.db('immm').tableList().run().then(console.log);

let userTable = r.db('immm').table('user');

let config = require('./config.json');

let rdbStore = new RDBStore(r, {
  table: 'session',
  sessionTimeout: 86400000,
  flushInterval: 60000,
  debug: false
});

passport.use(new LocalStrategy(
  function (username, password, done) {
    console.log(username, password);
    userTable.getAll(username, {index: "username"}).run().then((users) => {
      console.log(users);
      if (users.length < 1) return done(null, false);
      let user = users[0];
      if (user.password == password) {
        return done(null, user);
      }
      return done(null, false);
    }).catch((error) => {
      console.error(error);
      done(error);
    });
  }
));

passport.deserializeUser(function (id, cb) {
  userTable.get(id).run().then((user) => {
    cb(null, user);
  }).catch(error => {
    cb(error);
  });
});

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(logger('combined'));
app.use(cookie());
app.use(session({
  key: 'sid',
  secret: 'my5upeiueorSEC537(key)!',
  resave: false,
  httpOnly: true,
  sameSite: true,
  cookie: {secure: 'auto', maxAge: 8600000},
  store: rdbStore
}));

app.listen(3045, () => {
  console.log(`Server listening at port ${3045}`);
});

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/',
  function (req, res) {
    res.render('home', {user: req.user});
  });

app.get('/login',
  function (req, res) {
    res.render('login');
  });

app.post('/login',
  passport.authenticate('local', {failureRedirect: '/login'}),
  function (req, res) {
    console.log(req.body);
    res.redirect('/');
  });

app.get('/logout',
  function (req, res) {
    req.logout();
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function (req, res) {
    res.render('profile', {user: req.user});
  });

app.post('/users', (req, res) => {
  console.log(req.json());
});

app.get('/users', (req, res) => {

});

app.patch('/users', (req, res) => {

});

app.post('/resume', function (req, res) {
  upload(req, res, function (err, name) {
    if (err) {
      return res.end("Error uploading file.");
    }
    res.end("File is uploaded");
    let pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      r
        .db('immm')
        .table('resumes')
        .insert(pdfData)
        .run()
        .then((record) => {
        console.log(record);
          userTable.get(user.id).update({resumeId: record.id})
        })
        .catch(console.error);
    });

    pdfParser.loadPDF(`./uploads/${name}`);

  });
});

var  finalString = "";
var valuArr = new Array();
var ret = new Array();
app.host('sendSearch', (req, res) => {
  upload(req, res, function (err, values) {
    if (err) {
      return res.end("Error uploading file.");
    }
    var temp = 0;

    let resumeTable = r.db('immm').table('resume');
    resumeTable.getAll().run().then((resumes) => {
      resumes.forEach((resume) => {
        finalString = getString(resume);
        for(var i = 0; i < values.length; i++) {
          temp += getScore(values[i], resume);
        }

        sort(valuArr, ret, temp, resume);
      })

    });
  });
  return ret;
});

function sort (arr1, arr2, num, res){
  for( var i = 0; i < 9; i++) {
    if(arr1[i] != null){
      if (arr1[i] < num){
        var temp = num;
        num = arr1[i];
        arr[i] = temp;
        temp = res;
        res = arr2[i];
        arr2[i] = temp;
      }
    } else {
      arr1[i] = num;
      num = 0;
      arr2[i] = res;
    }
  }
}

function getString(obj){
  var returnValue = ""
  if(typeof obj === 'string'){
    returnValue += obj;
  } else if (typeof obj == 'object'){
    returnValue += getString(obj);
  } else {
    returnValue += "";
  }
  return returnValue;
}

function getScore(value, resume){
  var temp = 0;
  if(resume.includes(value)){
    temp++;
  }

  return temp;
}

app.get('/login/register', (req, res) => {
  res.render('register');
});

app.post('/login/register', (req, res) => {
  console.log(req.body);
  userTable.insert(req.body).run();
  res.redirect('/');
});
