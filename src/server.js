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
    callback(null, path.join(__dirname, './test/'));
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now() + ".pdf");
  }
});

var bool = false;
let LocalStrategy = require('passport-local').Strategy;

let session = require('express-session');
let RDBStore = new (require('session-rethinkdb'))(session);
let R = require("rethinkdbdash");
let r = new R({servers: {host: 'localhost', db: 'immm', port: 28015}});

var path = require("path");
var upload = multer({storage: storage});

r.db('immm').tableList().run().then(console.log);

let resumeTable = r.db('immm').table('resumes');
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
    userTable.getAll().then(console.log);
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
  console.log("deserialise ID", id);
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

/*app.get('/',
 function (req, res) {
 res.render('home', {user: req.user});
 });
 */

async function isAuthed(rawUser) {
  let dbUsers = await userTable.getAll(rawUser.username, {index: "username"}).run();
  if (dbUsers.length < 1) return false;
  let user = dbUsers[0];
  if (user.password == rawUser.password) {
    return user;
  }
  return false;
}


app.post('/login',
  passport.authenticate('local', {failureRedirect: '/login'}),
  function (req, res) {
    res.json(req.user);
    console.log(req.body);
    console.log(req.body);
  });

app.patch('/login',
  (req, res) => {
    console.log("Got patch", req.body);
    let data = req.body;
    isAuthed(data.user).then((user => {
      userTable.get(user.id).update({password: data.password}).run().then(() => {
        userTable.get(user.id).then((user) => {
          res.json(user);
        })
      });
    })).catch(console.error);
  });

app.get('/logout',
  function (req, res) {
    req.logout();
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function (req, res) {
    res.json({user: req.user});
  });

app.post('/users', (req, res) => {
  console.log(req.json());
});

app.get('/users', (req, res) => {

});

app.get('/api/user', (req, res) => {
  console.log("User request", req.user);
  res.json(req.user);
});

app.patch('/users', (req, res) => {

});

app.post('/resume', upload.single('file'), function (req, res) {
  console.log(req.file);
  console.log(req.body);

  res.json({sucess: true});


  let pdfParser = new PDFParser();

  pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
  pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log(pdfData);
    r
      .db('immm')
      .table('resumes')
      .insert(pdfData)
      .run()
      .then((record) => {
        console.log(record);
        userTable.get(req.body.user.id).update({resume: {id: record.id, name: req.file.filename, data: req.body.data}})
      })
      .catch(console.error);
  });

  pdfParser.loadPDF(path.join(req.file.destination, req.file.filename));
});

app.post('/sendSearch', function (req, res) {

      var finalString = "";      //  Final String
      var valuArr = new Array();    // Array of value, value of resume
      var ret = new Array();        // Array of resumes to return

      var temp = 0;


      resumeTable.run().then((resumes) => {
        console.log(resumes);
        resumes.forEach((resume) => {
          finalString = getString(resume);
          for (var i = 0; i < values.length; i++) {
            temp += getScore(values[i], resume);
          }

          sort(valuArr, ret, temp, resume);
          temp = 0;
        })

      }).catch(console.error);

});

function sort(arr1, arr2, num, res) {
  for (var i = 0; i < 9; i++) {
    if (arr1[i] != null) {
      if (arr1[i] < num) {
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

function getString(obj) {
  var returnValue = ""
  if (typeof obj === 'string') {
    returnValue += obj;
  } else if (typeof obj == 'object') {
    returnValue += getString(obj);
  } else {
    returnValue += "";
  }
  return returnValue;
}

function getScore(value, resume) {
  var temp = 0;
  if (resume.includes(value)) {
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

passport.use(new LocalStrategy(
  function (username, admin, done) {
    console.log(username, admin);
    userTable.getAll().then(console.log);
    userTable.getAll(username, {index: "username"}).run().then((users) => {
      console.log(users);
      if (users.length < 1) return done(null, false);
      let user = users[0];
      if (user.admin == admin) {
        return done(null, user);
      }
      return done(null, false);
    }).catch((error) => {
      console.error(error);
      done(error);
    });
  }
));

app.use(express.static(path.join(__dirname, '../../ClientSide/dist/')));