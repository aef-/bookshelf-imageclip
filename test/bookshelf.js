'use strict';

var Promise = require('bluebird'),
    should  = require('should'),
    fs = require('fs-extra');

var knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: "./testdb" }
});

var bookshelf = require('bookshelf')(knex);
bookshelf.plugin('registry');
bookshelf.plugin(require('../src/imageclip.js'), {useImageMagick: true});

describe('Bookshelf', function() {
  this.timeout(10000);

  before(function() {
    return Promise.all([
      knex.schema.dropTableIfExists('users').then(function() {
        return knex.schema.createTable('users', function(t) {
          t.increments('id').primary();
          t.string('avatar_file_name');
        });
      })
    ]);
  });

  before(function() {
    this.User = bookshelf.Model.extend({
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

    this.User = bookshelf.model('User', this.User);
  });

  it('should overload attributes when data passed through forge', function() {
    var testUser = this.User.forge({ avatar: "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png"});
    return testUser.save().then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("images/244/8ea/avatar/original/Lenna.png")
      user.get("avatar").medium.should.equal("images/244/8ea/avatar/medium/Lenna.png")
      user.get("avatar").thumb.should.equal("images/244/8ea/avatar/thumb/Lenna.png")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( user.get("avatar").original );
      fs.statSync( user.get("avatar").medium );
      fs.statSync( user.get("avatar").thumb );
    });
  });
  it('should should overload attributes when data passed through save as object', function() {
    var testUser = this.User.forge();
    return testUser.save({ avatar: "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png"}).then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("images/244/8ea/avatar/original/Lenna.png")
      user.get("avatar").medium.should.equal("images/244/8ea/avatar/medium/Lenna.png")
      user.get("avatar").thumb.should.equal("images/244/8ea/avatar/thumb/Lenna.png")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( user.get("avatar").original );
      fs.statSync( user.get("avatar").medium );
      fs.statSync( user.get("avatar").thumb );
    });
  });
  it('should should overload attributes when data passed through save as arguments', function() {
    var testUser = this.User.forge();
    return testUser.save( "avatar", "http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png").then(function(user) {
      user.get("avatar").should.have.property( "original" );
      user.get("avatar").should.have.property( "medium" );
      user.get("avatar").should.have.property( "thumb" );

      user.get("avatar").original.should.equal("images/244/8ea/avatar/original/Lenna.png")
      user.get("avatar").medium.should.equal("images/244/8ea/avatar/medium/Lenna.png")
      user.get("avatar").thumb.should.equal("images/244/8ea/avatar/thumb/Lenna.png")

      var serialized = testUser.toJSON( );
      serialized.avatar.should.have.property( "original" );
      serialized.avatar.should.have.property( "medium" );
      serialized.avatar.should.have.property( "thumb" );

      fs.statSync( user.get("avatar").original );
      fs.statSync( user.get("avatar").medium );
      fs.statSync( user.get("avatar").thumb );
    });
  });


});
