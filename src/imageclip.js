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
    constructor: function( ) {
      if( typeof options.storage == "string" )
        this.imageClipStorage = new ( require( "./storage/" + options.storage ) );
      else
        this.imageClipStorage = options.storage;

      if( typeof options.storage == "string" )
        this.imageClipAdapter = require( "./adapters/" + options.adapter );
      else
        this.imageClipAdapter = options.adapter;

      this.on( "saving", this.imageClipProcessor.save );
      this.on( "destroyed", this.imageClipProcessor.destroy );
      if(this.imageClip && !this.imageClipProcessor.isLoaded) {
        this.imageClipProcessor.isLoaded = true;
        for (const field in this.imageClip) {
          Object.defineProperty(this, field, {
            enumerable: true,
            get: this.getField.bind(this, field),
            set: this.setField.bind(this, field),
          });
        }

      }
      proto.constructor.apply( this, arguments );
    },

    get(field, ...params) {
      const { imageClip } = this;
      if( _.isObject(imageClip) && imageClip[field] )
        return this.getField(field);

      return proto.get.apply(this, arguments);
    },

    set(key, value, ...params) {
      const { imageClip } = this;
      if(_.isObject(imageClip)) {
        if(_.isObject(key)) {
          _.each(key, (v, k) => {
            if (imageClip[k]) {
              delete key[k];
              this.setField(k, v, ...params);
            }
          });
        }
        else if (imageClip[key]) {
          return this.setField(key, value, ...params)
        }
      }

      return proto.set.call(this, key, value, ...params);
    },

    getField(field) {
      const { imageClip } = this;
      const basePath  = options.path;
      if (this.get( `${field}_file_name` )) {
        return _.mapValues(imageClip[field], ( process, styleName ) => {
          return path.join( "/", this.imageClipProcessor
            .generateFilePath(
              basePath, field, styleName,
              this.get( `${field}_file_name` ) ),
            this.get( `${field}_file_name` ) );
        } );
      }
    },

    setField(field, source, ...params) {
      proto.set.call(this, `${field}_source`, source );

      proto.set.call(this, `${field}_file_name`,
        this.imageClipProcessor.generateFileName(
          this.imageClipAdapter.getFileName( source ) ) );
    },

    format( attributes ) {
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
      isLoaded: false,
      save( model, attributes, opts ) {
        return Promise.all(
                this.imageClipProcessor.saveImages.apply( this, arguments ) );
      },

      saveImages( model, attrs, opts ) {
        const basePath  = options.path;
        const attributes = _.extend({ }, model.attributes, attrs );

        return _.flatten( _.map( this.imageClip, ( styles, field ) => {
          if(!model.hasChanged( `${field}_file_name` ))
            return; 

          return _.map( styles, ( styleOpts, styleName ) => {
            const fileName = model.get( `${field}_file_name` );
            if( fileName ) {
              const filePath = this.imageClipProcessor
                  .generateFilePath(basePath, field, styleName, fileName);
              return new Promise( ( resolve, reject ) => { 
                const file = this.imageClipAdapter.getFilePath(attributes[ `${field}_source`], reject);
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
        return Math.round(Math.random( ) * 100000) + path.basename(fieldValue.split('?')[0]).replace(/([^a-z0-9.]+)/gi, '');
      },

      generateFilePath(basePath, fieldName, styleName, fileName) {
        const hash = crypto.createHash('md5').update(fileName).digest('hex'),
            tokens = hash.match( /(\w{3})(\w{3})/ );

        return path.join(basePath, tokens[1], tokens[2], fieldName, styleName );
      },
    },
    toJSON(options) {
      const attrs = proto.toJSON.call(this, options);
      const virtuals = _.mapValues(this.imageClip, (v, k) => this.getField(k))

      return _.extend(attrs, virtuals);
    },
  } );

  Bookshelf.Model = Model;
};
