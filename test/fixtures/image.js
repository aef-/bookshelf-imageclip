const db = require('./db')( );
const Image = db.bookshelf.Model.extend({
  tableName: 'images',
  virtuals: { 
    noopVirtual: {
      set( ) { },
      get( ) { return "noop"; }
    },
  },
  imageClip: {
    poster: {
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
  }
});

module.exports = db.bookshelf.model( 'Image', Image );
