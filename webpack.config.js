// webpack.config.js
var webpack = require('webpack');
var path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  // devtool: 'source-map',
  entry: {
    main:'./src/InfiniteGridScroller.tsx'
  },
  output: {
    filename: 'build.js',
    path: path.resolve('lib'),
    library:'react-infinite-grid-scroller',
    libraryTarget:'umd',
    clean:true
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
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,
            },
          },
        ],
      },
      {
          test: /\.css?$/,
          use:['style-loader','css-loader']
      }
      ]
  },
  externals: {
      react: 'react',
      "react-dom": 'react-dom'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
};