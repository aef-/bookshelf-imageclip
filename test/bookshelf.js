'use strict';

const Promise = require('bluebird'),
    should  = require('should'),
    fs = Promise.promisifyAll(require('fs-extra'));

const db = require('./fixtures/db')( );
const User = require('./fixtures/user');
const Post = require('./fixtures/post');
const Image = require('./fixtures/image');

describe('Bookshelf', function() {
  this.timeout(15000);

  beforeEach(() => Promise.all([
      db.knex.schema.dropTableIfExists('users'),
      db.knex.schema.dropTableIfExists('posts'),
      db.knex.schema.dropTableIfExists('images'),
    ])
    .then(() => db.knex.schema.createTable('users', function(t) {
        t.increments('id').primary();
        t.string('avatar_file_name');
        t.string('username');
      }))
    .then( ( ) => db.knex.schema.createTable('posts', function(t) {
        t.increments('id').primary();
      }))
    .then( ( ) => db.knex.schema.createTable('images', function(t) {
        t.increments('id').primary();
        t.string('poster_file_name');
        t.integer('imageable_id');
        t.string('imageable_type');
      }))
    .then( ( ) => fs.removeAsync( './images' ))
  );

  it('should overload attributes when data passed through forge', function() {
    var testUser = User.forge({ avatar: "./test/fixtures/earth.jpg"});
    return testUser.save().then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/original\/\d{4,5}earth.jpg/)
      user.get("avatar").medium.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/medium\/\d{4,5}earth.jpg/)
      user.get("avatar").thumb.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/thumb\/\d{4,5}earth.jpg/)

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

      user.get("avatar").original.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/original\/\d{1,5}earth.jpg/)
      user.get("avatar").medium.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/medium\/\d{1,5}earth.jpg/)
      user.get("avatar").thumb.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/thumb\/\d{1,5}earth.jpg/)

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

      user.get("avatar").original.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/original\/\d{1,5}earth.jpg/)
      user.get("avatar").medium.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/medium\/\d{1,5}earth.jpg/)
      user.get("avatar").thumb.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/thumb\/\d{1,5}earth.jpg/)

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    });
  });

  it('should clean quotes from filename', function() {
    var testUser = User.forge();

    return testUser.save( "avatar", "./test/fixtures/earth's weird filename.jpg").then(user => {
      const id = user.get( "id" );
      return User.forge( { id: id } ).fetch( )
    } )
    .then( function( user ) {
      user.get("avatar").original.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/original\/\d{1,5}earthsweirdfilename.jpg/)
      user.get("avatar").medium.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/medium\/\d{1,5}earthsweirdfilename.jpg/)
      user.get("avatar").thumb.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/thumb\/\d{1,5}earthsweirdfilename.jpg/)
    } );
  } );

  it('should save filename to database', function() {
    var testUser = User.forge();

    return testUser.save( "avatar", "./test/fixtures/earth.jpg").then(user => {
      const id = user.get( "id" );
      return User.forge( { id: id } ).fetch( )
    } )
    .then( function( user ) {
      user.get("avatar").original.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/original\/\d{1,5}earth.jpg/)
      user.get("avatar").medium.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/medium\/\d{1,5}earth.jpg/)
      user.get("avatar").thumb.should.match(/\/images\/[0-9a-z]{3}\/[0-9a-z]{3}\/avatar\/thumb\/\d{1,5}earth.jpg/)
    } );
  } );
  it('should return undefined when not set', function( done ) {
    var testUser = User.forge();
    should.not.exist(testUser.get( "avatar" ));
    done( );
  } );

  it('should save jpeg', function() {
    const testUser = User.forge();
    return testUser.save( "avatar", "./test/fixtures/earth.jpg").then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      const serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( "." + user.get("avatar").original );
      fs.statSync( "." + user.get("avatar").medium );
      fs.statSync( "." + user.get("avatar").thumb );
    });
  });

  it('should update ancillary attributes without image being passed', function() {
    const testUser = User.forge();
    return testUser.save( "avatar", "./test/fixtures/earth.jpg")
    .then(function(user) {
      const file = fs.statSync( "." + user.get("avatar").medium );
      const modifiedTime = file.mtime.toString();
      return user.save({ username: "name1" })
      .delay( 1000 )
      .then(function(user) {
        user.get("username").should.equal('name1');
        return User.forge().where({ id: user.get('id') }).fetch();
      }).then(function(user) {
        return user.save({ username: 'name2' })
      }).then(function(user) {
        const file = fs.statSync( "." + user.get("avatar").medium );
        //Checks to make sure image is not reprocessed since it hasn't changed.
        file.mtime.toString().should.equal(modifiedTime);
        user.get("username").should.equal('name2');
      });
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
