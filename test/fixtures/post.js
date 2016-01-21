const db = require('./db')( );
require( './image' );
const Post = db.bookshelf.Model.extend({
  tableName: 'posts',
  virtuals: { 
    noopVirtual: {
      set( ) { },
      get( ) { return "noop"; }
    },
  },
  images( ) {
    return this.morphMany( "Image", "imageable" );
  }
});

module.exports = db.bookshelf.model( 'Post', Post );
