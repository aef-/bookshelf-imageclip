module.exports = {
  getFileName( source ) {
    return source.filename;
  },
  getFilePath( source, reject ) {
    return source.path;
  }
};
