const bunyan = require('bunyan');
const EventEmitter = require('events');
const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const toml = require('toml');
const NodeGit = require('git');

const tree = require('@inexorgame/tree');
const inexor_path = require('@inexorgame/path');

const debuglog = util.debuglog('instances');
const log = require('@inexorgame/logger')();

/**
 * Management service for web user interfaces.
 */
class WebUserInterfaceManager extends EventEmitter {

  /**
   * @constructor
   */
  constructor(applicationContext) {
    super();

  }

  /**
   * Sets the dependencies from the application context.
   * @function
   */
  setDependencies() {

    /// The Inexor Tree root node
    this.root = this.applicationContext.get('tree');

    /// The router of the Inexor Flex webserver
    this.router = this.applicationContext.get('router');

    /// The Inexor Tree node containing interfaces
    this.interfacesNode = this.root.getOrCreateNode('interfaces');

    /// The class logger
    this.log = this.applicationContext.get('logManager').getLogger('flex.interfaces.WebUserInterfaceManager');

  }

  /**
   * Initialization after the components in the application context have been
   * constructed.
   * @function
   */
  afterPropertiesSet() {
    this.loadInterfaces().then(() => {
      return new Promise((resolve, reject) => {
        this.interfacesNode.getChildNames().forEach((name) => {
            this.updateInterface(name);
        })

        resolve(true);
      })
    }).then(() => {
      this.scanForInterfaces();
    })
  }

  /**
   * Creates a web user interface.
   * @function
   * @param {string} name The name of the web user interface.
   * @param {string} description The description of the web user interface.
   * @param {string} path The path to use on the web server of this Inexor Flex Instance (http://host:port/api/v1/interfaces/:path).
   * @param {string} folder The folder to be delivered (:flex_base_folder/interfaces/:path/:folder).
   * @param {string} repository The URL of the remote git repository.
   */
  createInterface(name, description, path, folder, repository) {
    let interfaceNode = this.interfacesNode.addNode(name);
    interfaceNode.addChild('name', 'string', name);
    interfaceNode.addChild('description', 'string', description);
    interfaceNode.addChild('path', 'string', path);
    interfaceNode.addChild('folder', 'string', folder);
    interfaceNode.addChild('repository', 'string', repository);
    interfaceNode.addChild('enabled', 'bool', false);
    interfaceNode.addChild('relativeFsPath', 'string', '');
    interfaceNode.addChild('absoluteFsPath', 'string', '');
    interfaceNode.addChild('relativeUrl', 'string', '');
    interfaceNode.addChild('fullUrl', 'string', '');
    this.updateInterfaceNode(name);
    this.updateInterface(name);
    this.enableInterface(name);
  }

  /**
   * Updates the tree node values for the given user interface.
   * @function
   * @param {string} name The name of the web user interface.
   */
  updateInterfaceNode(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    interfaceNode.relativeFsPath = this.getRelativeFsPath(name);
    interfaceNode.absoluteFsPath = this.getAbsoluteFsPath(name);
    interfaceNode.relativeUrl = this.getRelativeUrl(name);
    interfaceNode.fullUrl = this.getFullUrl(name);
  }

  /**
   * Returns true, if a web user interface exists with the given name.
   * @function
   * @param {string} name The name of the web user interface.
   */
  interfaceExists(name) {
    return this.interfacesNode.hasChild(name);
  }

  /**
   * Returns the local Removes a web user interface.
   * @function
   * @param {string} name The name of the web user interface.
   */
  getPath(name) {
    if (this.interfaceExists(name)) {
      return this.interfacesNode.getChild(name).path;
    } else {
      return null;
    }
  }

  /**
   * Removes a web user interface.
   * @function
   * @param {string} name The name of the web user interface.
   */
  removeInterface(name) {
    // TODO: implement
    let interfaceNode = this.interfacesNode.removeChild(name);

    if (this.interfacesNode.hasChild(name)) {
      let interfaceNode = this.interfacesNode.removeChild(name);
      return interfaceNode;
    } else {
      return null;
    }
  }

  /**
   * Enables a web user interface.
   * @function
   * @param {string} name The name of the web user interface.
   */
  enableInterface(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    this.router.use(interfaceNode.relativeUrl, express.static(interfaceNode.absoluteFsPath));
    this.log.info(util.format('Enabled user interface %s on %s', interfaceNode.absoluteFsPath, interfaceNode.fullUrl));
    this.log.debug('The static files of %s are located at %s', name, interfaceNode.relativeUrl);
    interfaceNode.enabled = true;
  }

  /**
   * Disables a web user interface.
   * @function
   * @param {string} name The name of the web user interface.
   */
  disableInterface(name) {
    this.interfaceNode.enabled = false;
    // TODO: implement
    // see https://github.com/expressjs/express/issues/2596
  }

  /**
   * Updates the local git repository to the latest revision of the remote
   * git repository.
   *
   * @function
   * @param {string} name The name of the web user interface.
   */
  updateInterface(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    let interfacePath = interfaceNode.path;

    if (fs.existsSync(path)) {
      NodeGit.Repository.open(interfacePath).then((repo) => {
        return repo.fetchAll({
            callbacks: {
                credentials: function(url, userName) {
                    return nodegit.Cred.sshKeyFromAgent(userName);
                },
                certificateCheck: function() {
                    return 1;
                }
            }
        });
      }).then(() => {
        return repo.mergeBranches("master", "origin/master");
      }).done(() => {
        this.log.info(`Checked out latest master`);
      }).catch((err) => {
        this.log.warn(`Something went wrong while opening repository of ${name} at ${interfacePath}`);
      })
    } else {
      let repositoryUri = interfaceNode.repository;

      if (repositoryUri == null) {
        this.log.warn(`Trying to clone interface without repository uri ${name}`)
      } else {
        this.log.info(`Cloning interface ${name} from ${repositoryUri}`);

        NodeGit.Clone(repositoryUri, interfacePath, {
            fetchOpts: {
                callbacks: {
                    certificateCheck: function() {
                        return 1;
                    }
                }
            }
        }).then((repo) => {
          this.log.info(`Successfully cloned interface ${name} to ${interfacePath}`)
          // TODO: Currently we ALWAYS use master branch
          repo.getBranch('refs/remotes/origin/master').then((ref) => {
            return repo.checkoutRef(ref);
          })
        })
      }
    }
  }

  /**
   * Loads a web user interface from TOML config.
   * @function
   * @param {string} [filename] - The filename.
   * @return {Promise<bool|string>} - either true or the error reason
   */
  loadInterfaces(filename = 'interfaces.toml') {
    return new Promise((resolve, reject) => {
        let config_path = this.profileManager.getConfigPath(filename);
        this.log.info(`Loading interfaces from ${filename}`);
        fs.readFile(config_path, ((err, data) => {
          if (err) {
            this.log.err(`Failed to load interfaces config because of ${err}`);
            reject(err);
          }

          let config = toml.parse(data.toString());

          for (let interface of Object.keys(config.interfaces)) {
            this.createInterface(
                config.interfaces[interface].name,
                config.interfaces[interface].description,
                config.interfaces[interface].path,
                inexor_path.interfaces_path,
                config.interfaces[interface].repository,
            )
          }
        }))
    })
  }

  /**
   * Scans for web user interfaces found locally.
   * @function
   */
  scanForInterfaces() {
    return new Promise((resolve, reject) => {
      let paths = [path.join(inexor_path.flex_path, 'interfaces'), inexor_path.interfaces_path]

      paths.forEach((folder) => {
        fs.readdir(folder, (err, files) => {
          if (err) {
            this.log.error(err)
            reject(err)
          }

          files.forEach((file) => {
            fs.stat(file, (err, stats) => {
              if (err) {
                this.log.error(err)
                reject(err)
              }

              if (stats.isDirectory()) {
                this.createInterface(file, 'scanned repository', file, folder, `file://${path.resolve(file)}`);
              }
            })
          })
        })
      })
    })
  }

  /**
   * Returns the list of interface names.
   * @function
   * @return {array} The names of the user interfaces
   */
  getInterfaceNames() {
    return this.interfacesNode.getChildNames();
  }

  /**
   * Returns the filesystem path relative to Inexor Flex.
   * @function
   * @param {string} name The name of the web user interface.
   */
  getRelativeFsPath(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    return util.format('interfaces/%s/%s', interfaceNode.path, interfaceNode.folder);
  }

  /**
   * Returns the absolute filesystem path.
   * @function
   * @param {string} name The name of the web user interface.
   */
  getAbsoluteFsPath(name) {
    return path.join(inexor_path.interfaces_path, name);
  }

  /**
   * Returns the URL
   * @function
   * @param {string} name The name of the web user interface.
   */
  getRelativeUrl(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    return util.format('/interfaces/%s/', interfaceNode.path);
  }

  /**
   * Returns the full URL
   * @function
   * @param {string} name The name of the web user interface.
   */
  getFullUrl(name) {
    let interfaceNode = this.interfacesNode.getChild(name);
    return util.format('/api/v1/interfaces/%s/', interfaceNode.path);
  }

}

module.exports = WebUserInterfaceManager;
