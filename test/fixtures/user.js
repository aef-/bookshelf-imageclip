const db = require('./db')( );
const User = db.bookshelf.Model.extend({
  tableName: 'users',
  virtuals: { 
    noopVirtual: {
      set( ) { },
      get( ) { return "noop"; }
    },
  },
  imageClip: {
    avatar: {
      original: {
        process: function( gmInst, model ) {
          return gmInst;
        }
      },
      medium: {
        process: function( gmInst, model ) {
          return gmInst.resize( "500x500" ) ;
        }
      },
      thumb: {
        process: function( gmInst, model ) {
          return gmInst.resize( "100x100" ) ;
        }
      }
    }
  },
  album( ) {
    return this.morphMany( "Image", "imageable" );
  },
  favoritePicture( ) {
    return this.morphOne( "Image", "imageable" );
  },
});

module.exports = db.bookshelf.model( 'User', User );
