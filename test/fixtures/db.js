const _ = require('lodash');

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: "./testdb" }
});
const bookshelf = require('bookshelf')(knex);
bookshelf.plugin('registry');

module.exports = options => {
  bookshelf.plugin(require('../../src/imageclip.js'), _.defaults(options || { }, {useImageMagick: true}));
  bookshelf.plugin('virtuals')
  return {bookshelf: bookshelf, knex: knex};
};
