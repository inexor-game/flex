const TreeClient = require('@inexor-game/treeclient').TreeClient;
const log = require('@inexor-game/logger')();

exports.command = 'load';
exports.describe = 'Load release config';

exports.handler = function(argv) {
    log.info('Loading release config from the command-line')
    let client = new TreeClient(argv.profileHostname, argv.profilePort);
    client.releases.load((data, response) => {
        if (response.statusCode == 200) {
            log.info(JSON.stringify(data));
        }
    })
}
