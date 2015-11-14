"use strict";
module.exports = function(Bookshelf, pluginOpts) {
  
  Bookshelf.plugin('virtuals');

  const _       = require('lodash'),
    Promise = require('bluebird'),
    path    = require('path'),
    crypto  = require('crypto'),
    //request = require("request"),
    request = Promise.promisifyAll(require("request")),
    fs      = Promise.promisifyAll(require('fs-extra')),
    md5     = crypto.createHash('md5');

  let gm = Promise.promisifyAll(require('gm'));

  Promise.promisifyAll(gm.prototype);

  const options = _.defaults( pluginOpts || { }, { 
    useImageMagick: false,
    path: "./images",
    storage: "file"
  } );

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

        _.each( this.imageClip, ( styles, field ) => { 
          this.virtuals[ field ] = { 
            get( ) {
              return _.mapValues( styles, ( style, styleName ) => {
                return path.join( this.imageClipProcessor
                                      .generateFilePath( 
                                        basePath, field, styleName, 
                                        this.get( `${field}_file_name` ) ), 
                                  this.get( `${field}_file_name` ) );
              } );
            },
            set( source ) {
              this.set( `${field}_file_name`, 
                   this.imageClipProcessor.generateFileName( source ) );
            }
          }
        } );

        this.on( "saving", this.imageClipProcessor.save );
        this.on( "destroyed", this.imageClipProcessor.destroy );
      }

      proto.constructor.apply( this, arguments );
    },

    imageClipProcessor: {
      save( model, attributes, opts ) {
        return Promise.all( 
                this.imageClipProcessor.saveImages.apply( this, arguments ) );
      },

      saveImages( model, attributes, opts ) {
        const basePath  = options.path;
        return _.flatten( _.map( this.imageClip, ( styles, field ) => {
          return _.map( styles, ( styleOpts, styleName ) => {
            const fileName = model.get( `${field}_file_name` );
            if( attributes[ field ] ) {
              const filePath = this.imageClipProcessor
                  .generateFilePath(basePath, field, styleName, fileName);
              return new Promise( ( resolve, reject ) => { 
                return fs.mkdirpAsync( filePath ).then( ( ) => {
                  const req = request( attributes[ field ] )
                                .on( "error", reject );
                  return gm( req );
                } )
                .then( gm => {
                  return styleOpts.process( gm, model, attributes, opts )
                    .stream( (err, stdout, stderr) => { 
                      stdout.on( "end", resolve );
                      stdout.on( "error", reject );
                      stdout.pipe(this.imageClipStorage.write(
                        path.join( filePath, fileName ) ) );
                    } );
                } )
              } );
            }
          } );
        } ) );
      },

      destroy( model, attributes, opts ) {
        const basePath  = options.path;
        return _.flatten( this.imageClip.map( ( styles, field ) => {
          return styles.map( ( styleOpts, styleName ) => {
            return fs.removeAsync( model.get( field )[ styleName ] );
            //TODO remove empty directories here?
          } );
        } ) );
      }, 

      removeEmptyFolders(filePath) {
        const basePath  = options.path,
            directoryPath = path.relative(basePath, filePath),
            directories = directoryPath.split(path.sep);
      },

      generateFileName(fieldValue) {
        return path.basename(fieldValue);
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
