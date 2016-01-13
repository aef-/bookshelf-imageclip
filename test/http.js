'use strict';

var Promise = require('bluebird'),
    should  = require('should'),
    fs = Promise.promisifyAll(require('fs-extra')),
    assert = require('assert');

var knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: "./testdb" }
});

var bookshelf = require('bookshelf')(knex);
bookshelf.plugin('registry');
bookshelf.plugin(require('../src/imageclip'), {useImageMagick: true, adapter: 'http'});
const User = bookshelf.Model.extend({
  tableName: 'users',
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
  }
});

describe('HTTP', function() {
  this.timeout(20000);

  beforeEach(function() {
    return knex.schema.dropTableIfExists('users')
      .then(function() {
        return knex.schema.createTable('users', function(t) {
          t.increments('id').primary();
          t.string('avatar_file_name');
        });
      })
      .then( ( ) => {
        return fs.removeAsync( './images' );
      } )
  });

  it('can save new record', function() {
    var testUser = User.forge({ avatar: "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png"});
    return testUser.save().then(function(user) {
      fs.statSync( user.get("avatar").thumb );
      fs.statSync( user.get("avatar").original );
      fs.statSync( user.get("avatar").medium );
    });
  });

  it('can update record', function() {
    var testUser = User.forge({ avatar: "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png"});
    return testUser
      .save(null, { method: "insert" } )
      .then(function(user) {
        return testUser.save({ avatar: "https://upload.wikimedia.org/wikipedia/commons/d/df/The_Fabs.JPG"}, { method: "update" } );
      })
      .then(function(user) {
        fs.statSync( user.get("avatar").thumb );
        fs.statSync( user.get("avatar").original );
        fs.statSync( user.get("avatar").medium );
        assert.throws( function( ) { fs.statSync( previous.thumb ) }, 
                      "Old thumb still exists" );
        assert.throws( function( ) { fs.statSync( previous.original ) }, 
                      "Old original still exists" );
        assert.throws( function( ) { fs.statSync( previous.medium ) }, 
                      "Old medium still exists" );
      });
  });

  it('fails on not found', function() {
    var testUser = User.forge({ avatar: "http://image-does-not-exist.com/test.jpg"});
    return testUser
      .save()
      .then(function(user) {
        should(user).not.be.ok();
      })
      .catch( function( e ) {
      } );
  });


  it('INCOMPLETE: can destroy', function() {
    //TODO Files are deleted in an event after model is destroyed. Need to dive deeper
    //to see a good way to test for this.
    var testUser = User.forge({ avatar: "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png"}), previous;

    return testUser.save( ).then( function( user ) {
      previous = user.get( "avatar" );

      fs.statSync( user.get("avatar").thumb );
      //return user.destroy( );
    })
    .then(function( ) {
      /*
      assert.throws( function( ) { fs.statSync( previous.thumb ) }, 
                    "Old thumb still exists" );
      assert.throws( function( ) { fs.statSync( previous.original ) }, 
                    "Old original still exists" );
      assert.throws( function( ) { fs.statSync( previous.medium ) }, 
                    "Old medium still exists" );
                   */
    });

  });
});
