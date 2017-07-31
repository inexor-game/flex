const TreeClient = require('@inexorgame/treeclient').TreeClient;
const log = require('@inexorgame/logger')();

// Configuration for change the fullscreen state of the client window
exports.command = 'fullscreen <instance> <mode>'
exports.describe = 'Changes the fullscreen state of the client window'

exports.builder = {
  instance: {
    type: 'number',
    describe: 'The instance id.'
  },
  mode: {
    type: 'string',
    describe: 'The fullscreen state: window, fullscreen or windowed_fullscreen'
    // TODO: restrict to the possible values: window, fullscreen or windowed_fullscreen
  },
}

exports.handler = function(argv) {
  let client = new TreeClient(argv.profileHostname, argv.profilePort);
  client.flex.instances.client.window.fullscreen(argv.instance, argv.mode);
  log.info('Set fullscreen mode of client ' + argv.instance + ' to ' + argv.mode);
}
