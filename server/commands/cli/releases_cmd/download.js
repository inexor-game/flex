const TreeClient = require('@inexorgame/treeclient').TreeClient;
const log = require('@inexorgame/logger')();

exports.command = 'download [versionRange] [channelSearch]';
exports.describe = 'Download a release.';

exports.builder = {
  versionRange: {
    default: '*',
    type: 'string',
    describe: 'If given, the newest version fulfilling this semantic version range is downloaded.'
  },
  channelSearch: {
    default: '*',
    type: 'string',
    describe: 'If given and not "*" only versions in this particular channel are downloaded.'
  }
};

exports.handler = function(argv) {
  log.info(`Downloading release with version range ${argv.versionRange} @ ${argv.channelSearch} via the command-line`);
  let client = new TreeClient(argv.profileHostname, argv.profilePort);
  client.releases.download(argv.versionRange, argv.channelSearch, (data, response) => {
    // The log is already handled elsewhere
  });
};
