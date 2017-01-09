// Configures yargs to use the command directory
const process = require('process');
const argv = require('yargs')
  .commandDir('commands')
  .help()
  .argv


// Pull the dependencies
const express = require('express');

// Returns a logger instance
var log = require('@inexor-game/logger')(argv.console, argv.file, argv.level)

// Configures the server to be use-able as a RESTfull API
var app = express();
// app.use(express.static(argv.webdir));

// Handle logging
app.use((req, res, next) => {
  log.info('Called route ' + req.path);
  next();
})

// Handle errors
app.use((err, req, res, next) => {
  log.error(err);
  next(err);
})

// Require the router from the rest module
var api = require('@inexor-game/api').v1;
// Require the router from the plugins module
var plugins = require('@inexor-game/plugins');

// Fire in the hole!
app.use('/api/v1/', api);
// app.use('/api/plugins', plugins); // There is no fixed api version for plugins

app.listen(argv.port, () => {
  log.info('Inexor Flex is listening on ' + argv.port)
})
