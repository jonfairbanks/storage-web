const express = require('express');
const app = express();
const path = require('path');

app.use('/static', express.static(
  path.join(__dirname, 'node_modules/iota.lib.js/dist'))
);
app.use('/static', express.static(
  path.join(__dirname, 'node_modules/curl.lib.js/dist'))
);
app.use('/static', express.static(
  path.join(__dirname, 'node_modules/bootstrap/dist'))
);
app.use('/static', express.static(
  path.join(__dirname, 'node_modules/jquery/dist'))
);

app.use('/static', express.static(
  path.join(__dirname, 'node_modules/showdown/dist'))
);

app.use('/static', express.static(
  path.join(__dirname, 'static'))
);
app.set('view engine', 'pug');

app.get('/', function(req, res) {
  res.render('index', {title: 'IOTA '});
});

app.get('/download', function(req, res) {
  let bundle = req.param('id');
  res.render('download', {bundle: bundle});
});

app.get('/view', function(req, res) {
  let bundle = req.param('id');
  res.render('mdview', {bundle: bundle});
});

app.listen(3000, function() {
  console.log('Server is running on port 3000');
});

