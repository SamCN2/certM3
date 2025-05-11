const path = require('path');

module.exports = {
  entry: {
    app: './src/js/app.ts'
  },
  output: {
    path: path.resolve(__dirname, '../../static/js'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}; 