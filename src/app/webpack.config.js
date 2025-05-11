const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/js/app.ts',
  output: {
    path: path.resolve(__dirname, '../../static/js'),
    filename: 'app.js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
}; 