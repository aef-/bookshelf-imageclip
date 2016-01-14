"use strict";
module.exports = function(Bookshelf, pluginOpts) {
  
  Bookshelf.plugin('virtuals');

  const _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    crypto  = require('crypto'),
    md5     = crypto.createHash('md5');

  const options = _.defaults( pluginOpts || { }, { 
    useImageMagick: false,
    path: "./images",
    storage: "file",
    adapter: "local-file"
  } );

  let gm = Promise.promisifyAll(require('gm'));

  if( options.useImageMagick )
    gm = gm.subClass({ imageMagick: true });

  const proto = Bookshelf.Model.prototype;

  const Model = Bookshelf.Model.extend({
    virtuals: { },
    constructor: function( ) {
      if( this.imageClip) {
        const basePath  = options.path;
        if( typeof options.storage == "string" )
          this.imageClipStorage = new ( require( "./storage/" + options.storage ) );
        else
          this.imageClipStorage = options.storage;

        if( typeof options.storage == "string" )
          this.imageClipAdapter = require( "./adapters/" + options.adapter );
        else
          this.imageClipAdapter = options.adapter;

        _.each( this.imageClip, ( styles, field ) => { 
          this.virtuals[ field ] = { 
            get( ) {
              if( this.get( `${field}_file_name` ) )
                return _.mapValues( styles, ( style, styleName ) => {
                  return path.join( this.imageClipProcessor
                                        .generateFilePath( 
                                          basePath, field, styleName, 
                                          this.get( `${field}_file_name` ) ), 
                                    this.get( `${field}_file_name` ) );
                } );
            },
            set( source ) {
              this.set( `${field}_source`, source );

              this.set( `${field}_file_name`,  
                   this.imageClipProcessor.generateFileName( 
                            this.imageClipAdapter.getFileName( source ) ) );
            }
          }
        } );

        this.on( "saving", this.imageClipProcessor.save );
        this.on( "destroyed", this.imageClipProcessor.destroy );
      }

      proto.constructor.apply( this, arguments );
    },

    format: function( attributes ) {
      const formattedAttributes = proto.format.apply( this, arguments );

      if( this.imageClip) {
        const keys = _.keys( this.imageClip ) 
        return _.omit( formattedAttributes,  
          keys.concat( keys.map( k => `${k}_source` ) ) );
      }
      else
        return formattedAttributes;
    },

    imageClipProcessor: {
      save( model, attributes, opts ) {
        return Promise.all( 
                this.imageClipProcessor.saveImages.apply( this, arguments ) );
      },

      saveImages( model, attrs, opts ) {
        const basePath  = options.path;
        const attributes = _.extend({ }, model.attributes, attrs );

        return _.flatten( _.map( this.imageClip, ( styles, field ) => {
          return _.map( styles, ( styleOpts, styleName ) => {
            const fileName = model.get( `${field}_file_name` );
            if( fileName ) {
              const filePath = this.imageClipProcessor
                  .generateFilePath(basePath, field, styleName, fileName);
              return new Promise( ( resolve, reject ) => { 
                const file = this.imageClipAdapter.getFilePath(attributes[ `${field}_source`], reject);
                console.info( file );
                return styleOpts.process( gm(file), model, attributes, opts )
                    .stream( (err, stdout, stderr) => { 
                      if( err )
                        return reject( err );
                      stdout.on( "end", resolve );
                      stdout.on( "error", reject );
                      this.imageClipStorage.save( filePath, fileName )
                      .then( ( writeStream ) => stdout.pipe( writeStream ) )
                      .catch( reject );
                    } );
              } );
            }
          } );
        } ) );
      },

      destroy( model, attributes, opts ) {
        const basePath  = options.path;

        _.flatten( _.map( this.imageClip, ( styles, field ) => {
          const fileName = model.previous( `${field}_file_name` );
          return _.map( styles, ( styleOpts, styleName ) => {
            const filePath = this.imageClipProcessor
                  .generateFilePath(basePath, field, styleName, fileName);
            return this.imageClipStorage.destroy( filePath, fileName );
          } );
        } ) );
      }, 

      removeEmptyFolders(filePath) {
        const basePath  = options.path,
            directoryPath = path.relative(basePath, filePath),
            directories = directoryPath.split(path.sep);
      },

      generateFileName(fieldValue) {
        return path.basename(fieldValue.split('?')[0]);
      },

      generateFilePath(basePath, fieldName, styleName, fileName) {
        const hash = crypto.createHash('md5').update(fileName).digest('hex'),
            tokens = hash.match( /(\w{3})(\w{3})/ );

        return path.join(basePath, tokens[1], tokens[2], fieldName, styleName );
      }
    },
  } );

  Bookshelf.Model = Model;
};
