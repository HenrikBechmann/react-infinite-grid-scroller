// webpack.config.js
var webpack = require('webpack');
var path = require('path');

module.exports = {
  devtool: 'eval-source-map',
  entry: {
    main:'./src/infinitegridscroller.tsx'
  },
  output: {
    filename: 'build.js',
    path: path.resolve('lib'),
    library:'Scroller',
    libraryTarget:'umd'
  },
  resolve: {
    extensions: ['.tsx', '.js'],
    modules: ['src', 'node_modules']
  },
  module: {
    rules: [
      { 
          test: /\.tsx?$/, 
          use:['babel-loader','ts-loader']
      },
    ]
  },
  externals: {
      "react": "React",
      "react-dom": "ReactDOM"
  },
};