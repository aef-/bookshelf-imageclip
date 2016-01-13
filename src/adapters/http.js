const Promise = require('bluebird'),
      request = Promise.promisifyAll(require("request"));

module.exports = (url, reject) => {
  return request(url)
    .on( 'error', reject);
};
