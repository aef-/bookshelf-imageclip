'use strict';

const Promise = require('bluebird'),
    should  = require('should'),
    fs = Promise.promisifyAll(require('fs-extra'));

const db = require('./fixtures/db')( );
const User = require('./fixtures/user');
const Post = require('./fixtures/post');
const Image = require('./fixtures/image');

describe('Bookshelf', function() {
  this.timeout(10000);

  beforeEach(function() {
    return Promise.all([ 
      db.knex.schema.dropTableIfExists('users'),
      db.knex.schema.dropTableIfExists('posts'),
      db.knex.schema.dropTableIfExists('images'),
    ])
    .then(function() {
      return db.knex.schema.createTable('users', function(t) {
        t.increments('id').primary();
        t.string('avatar_file_name');
      });
    })
    .then( ( ) => {
      return db.knex.schema.createTable('posts', function(t) {
        t.increments('id').primary();
      });
    } )
    .then( ( ) => {
      return db.knex.schema.createTable('images', function(t) {
        t.increments('id').primary();
        t.string('poster_file_name');
        t.integer('imageable_id');
        t.string('imageable_type');
      });
    } )
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

  it('should work with morphMany and withRelated', function() {
    const testPost = Post.forge();
    const testUser = User.forge();
    return testPost.save( )
    .then(function(post) {
      return Image.forge({ 
        poster: "./test/fixtures/earth.jpg",
        imageable_type: "posts",
        imageable_id: post.get("id"),
      }).save( )
    })
    .then( image => {
      return testPost.fetch({ withRelated: ['images'] })
    })
    .then( postWithImages => {
      return testUser.save( )
    })
    .then( user => {
      return Image.forge({ 
        poster: "./test/fixtures/earth.jpg",
        imageable_type: "users",
        imageable_id: user.get("id"),
      }).save( )
    })
    .then( post => {
      return testUser.fetch({ withRelated: ['album'] })
    })
    .then( userWithAlbum => {
      return testUser.fetch({ withRelated: ['favoritePicture'] })
    })
    .then( post => {
      return testUser.fetch({ withRelated: ['album'] })
    })
    .then( userWithAlbum => {
      return testUser.fetch({ withRelated: ['favoritePicture'] })
    })
  });
});
