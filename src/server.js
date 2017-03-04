/**
 * Created by macdja38 on 2017-01-19.
 */
let express = require('express');
let bodyParser = require('body-parser');
let app = express();
let logger = require('morgan');

let config = require('./config.json');

app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.listen(3045, function () {
  console.log(`Server listening at port ${3045}`);
});

app.post('/users/', (req, res) => {

});

app.get('/users/', (req, res) => {

});

app.patch('/users/', (req, res) => {

});