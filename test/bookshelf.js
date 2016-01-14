'use strict';

var Promise = require('bluebird'),
    should  = require('should'),
    fs = Promise.promisifyAll(require('fs-extra'));

var knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: "./testdb" }
});

var bookshelf = require('bookshelf')(knex);
bookshelf.plugin('registry');
bookshelf.plugin(require('../src/imageclip.js'), {useImageMagick: true});

const User = bookshelf.Model.extend({
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
  }
});

describe('Bookshelf', function() {
  this.timeout(10000);

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

  it('should overload attributes when data passed through forge', function() {
    var testUser = User.forge({ avatar: "./test/fixtures/earth.jpg"});
    return testUser.save().then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("/images/704/247/avatar/original/earth.jpg")
      user.get("avatar").medium.should.equal("/images/704/247/avatar/medium/earth.jpg")
      user.get("avatar").thumb.should.equal("/images/704/247/avatar/thumb/earth.jpg")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    })
  });
  it('should overload attributes when data passed through save as object', function() {
    var testUser = User.forge();
    return testUser.save({ avatar: "./test/fixtures/earth.jpg"}).then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("/images/704/247/avatar/original/earth.jpg")
      user.get("avatar").medium.should.equal("/images/704/247/avatar/medium/earth.jpg")
      user.get("avatar").thumb.should.equal("/images/704/247/avatar/thumb/earth.jpg")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    });
  });
  it('should overload attributes when data passed through save as arguments', function() {
    var testUser = User.forge();
    return testUser.save( "avatar", "./test/fixtures/earth.jpg").then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("/images/704/247/avatar/original/earth.jpg")
      user.get("avatar").medium.should.equal("/images/704/247/avatar/medium/earth.jpg")
      user.get("avatar").thumb.should.equal("/images/704/247/avatar/thumb/earth.jpg")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    });
  });

  it('should not override existing virtuals', function() {
    var testUser = User.forge();
    testUser.get( "noopVirtual" ).should.equal( "noop" );
  } );
  it('should save filename to database', function() {
    var testUser = User.forge();

    return testUser.save( "avatar", "./test/fixtures/earth.jpg").then(user => {
      const id = user.get( "id" );
      return User.forge( { id: id } ).fetch( )
    } )
    .then( function( user ) {
      user.get("avatar").thumb.should.equal("/images/704/247/avatar/thumb/earth.jpg")
    } );
  } );
  it('should return undefined when not set', function( done ) {
    var testUser = User.forge();
    should.not.exist(testUser.get( "avatar" ));
    done( );
  } );

  it('should save jpeg', function() {
    var testUser = User.forge();
    return testUser.save( "avatar", "./test/fixtures/earth.jpg").then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    });
  });


});
