const Promise = require('bluebird'),
      request = Promise.promisifyAll(require("request"));

module.exports = {
  getFileName( source ) {
    return source;
  },
  getFilePath( source, reject ) {
    return request( source )
      .on( 'error', reject);
  }
};
