
const Promise = require('bluebird'),
  path    = require('path'),
  fs = Promise.promisifyAll(require('fs-extra'));

function FileStore( ) {
}

FileStore.prototype.save = function( filePath, fileName ) {
  return fs.mkdirpAsync( filePath ).then( ( ) => {
    return fs.createWriteStream( path.join( filePath, fileName ) );
  } );
};

FileStore.prototype.destroy = function( filePath, fileName ) {
  return fs.removeAsync( path.join( filePath, fileName ) );
};


module.exports = FileStore;
