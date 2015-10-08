module.exports = function(Bookshelf, pluginOpts) {
  
  var _       = require('lodash'),
      Promise = require('bluebird'),
      gm      = Promise.promisifyAll(require('gm')),
      path    = require('path'),
      crypto  = require('crypto'),
      //request = require("request"),
      request = Promise.promisifyAll(require("request")),
      fs      = Promise.promisifyAll(require('fs-extra')),
      md5     = crypto.createHash('md5');

  Promise.promisifyAll(gm.prototype);

  var pluginOpts = _.defaults( pluginOpts || { }, { 
    useImageMagick: false,
    path: "./images",
    storage: "file"
  } );

  if( pluginOpts.useImageMagick )
    gm = gm.subClass({ imageMagick: true });

  var proto = Bookshelf.Model.prototype;

  var Model = Bookshelf.Model.extend({
    set: function( key, val, options ) {
      var attrs;
      if( typeof key === 'object' && !( val && val.unset) && 
         !( options && options.unset ) ) {
        if( typeof key.avatar === 'string' ) {
          key.avatar_source = key.avatar;
          delete key.avatar;
        }
      } else {
      }

      return proto.set.call( this, key, val, options );
    },
    _reset: function( ) {
      if( this.imageClip ) {
        this._previousAttributes = _.extend( _.clone( this.attributes ),
          this.imageClipProcessor.getAttributes( this ) );
        this.changed = Object.create(null);
        return this;
      }
      else
        return proto._reset.apply( this, arguments );
    },
    constructor: function( ) {
      if( this.imageClip) {
        if( typeof pluginOpts.storage == "string" )
          this.imageClipStorage = new ( require( "./storage/" + pluginOpts.storage ) );
        else
          this.imageClipStorage = pluginOpts.storage;

        this.on( "saving", this.imageClipProcessor.save );
        this.on( "saved", this.imageClipProcessor.updateAttributes );
        this.on( "destroyed", this.imageClipProcessor.destroy );
        //this.on( "updated", this.imageClipProcessor.destroy );
      }

      proto.constructor.apply( this, arguments );
    },

    format: function( attributes ) {
      var formattedAttributes = proto.format.apply( this, arguments );

      if( this.imageClip) {
        var keys = _.keys( this.imageClip ) 
        formattedAttributes = _.omit( formattedAttributes,  
                keys.concat( _.map( keys, function( k ) { return k + "_source" } ) ) );
      }

      return formattedAttributes;
    },


    imageClipProcessor: {
      save: function( model, attributes, opts ) {
        return Promise.all( this.imageClipProcessor.saveImages.apply( this, arguments ) );
      },

      saveImages: function( model, attributes, opts ) {
        var basePath  = pluginOpts.path;
        return _.flatten( _.map( this.imageClip, function( styles, field ) {
          var fileName = this.imageClipProcessor.generateFileName( model.get( field + "_source" ) );
          model.set( field + "_file_name", fileName );

          return _.map( styles, function( styleOpts, styleName ) {
            if( model.hasChanged( field + "_source" ) && model.has( field + "_source" ) ) {
              var filePath = this.imageClipProcessor.generateFilePath(basePath, field, styleName, fileName);
              return new Promise( function( resolve, reject ) { 
                //return request( model.get( field ) ) );
                return fs.mkdirpAsync( filePath ).then( function( ) {
                  var req = request( model.get( field + "_source" ) )
                                .on( "error", reject );
                  return gm( req );
                }.bind( this ) )
                .then( function( gm ) {
                  return styleOpts.process( gm, model, attributes, opts )
                    .stream( function (err, stdout, stderr) { 
                      stdout.on( "end", resolve );
                      stdout.on( "error", reject );
                      stdout.pipe(this.imageClipStorage.write(
                        path.join( filePath, fileName ) ) );
                    }.bind( this ) );
                }.bind( this ) )
              }.bind( this ) )
            }
          }, this );
        }, this ) );
      },

      destroy: function( model, attributes, opts ) {
        var basePath  = pluginOpts.path;
        return _.flatten( _.map( this.imageClip, function( styles, field ) {
          return _.map( styles, function( styleOpts, styleName ) {
            return fs.removeAsync( model.previous( field )[ styleName ] );
            //TODO remove empty directories here?
          }, this );
        }, this ) );
      }, 

      updateAttributes: function( model, attr ) {
        model.set( this.imageClipProcessor.getAttributes( model ) );
      },

      getAttributes: function( model ) {
        var basePath = pluginOpts.path;
        return _.mapValues( model.imageClip, function( styles, field ) {
          if( !model.has( field + "_file_name" ) )
            return;
          return _.mapValues( styles, function( style, styleName ) {
            return path.join( model.imageClipProcessor.generateFilePath( basePath, field, styleName, 
                    model.get( field + "_file_name" ) ), model.get( field + "_file_name" ) );
          } );
        } );
      },

      removeEmptyFolders: function(filePath) {
        var basePath  = pluginOpts.path,
            directoryPath = path.relative(basePath, filePath),
            directories = directoryPath.split(path.sep),
            directory;
      },

      generateFileName: function(fieldValue) {
        return path.basename(fieldValue);
      },

      generateFilePath: function(basePath, fieldName, styleName, fileName) {
        var hash = crypto.createHash('md5').update(fileName).digest('hex'),
            tokens = hash.match( /(\w{3})(\w{3})/ );

        return path.join(basePath, tokens[1], tokens[2], fieldName, styleName );
      }
    },
  } );

  
  // Replacement.
  Bookshelf.Model = Model;
};
