var fs = require( 'fs' );

function FileStore( ) {
}

FileStore.prototype.write = function( writePath ) {
  return fs.createWriteStream( writePath );
};

module.exports = FileStore;
