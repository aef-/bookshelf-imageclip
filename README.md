# bookshelf-imageclip

## Installation
> npm install bookshelf-imageclip

## Usage
Best to look at the tests.

Your schema must include <field>_file_name.
```js
bookshelf.Model.extend({
  tableName: 'users',
  imageClip: {
    <field_name>: {
      <style_name>: {
        process: function( gm, model ) {
          return gm.resize( "500x500" ); //See node-gm documentation
        }
      }
    }
  }
```

## Examples
```js
    var bookshelf = require('bookshelf')(knex);
    bookshelf.plugin(require('bookshelf-imageclip'), {useImageMagick: true});
    
    User = bookshelf.Model.extend({
      tableName: 'users',
      imageClip: {
        avatar: {
          original: {
            process: function( gm, model ) {
              return gm;
            }
          },
          medium: {
            process: function( gm, model ) {
              return gm.resize( "500x500" ) ;
            }
          },
          thumb: {
            process: function( gm, model ) {
              return gm.resize( "100x100" ) ;
            }
          }
        }
      }
    });
    
    User.forge( )
        .save( { avatar: "http://hamburgerhelper.com/pigeon.jpg" } )
        .then( function( user ) {
          console.info( user.get( "avatar" ).medium ) // outputs: images/244/8ea/avatar/medium/pigeon.jpg
        } );
```

## Roadmap
See issues for milestones and changes for first stable release.

## Contributing
I'd be happy to pull in any requests as long as you add tests.
