module.exports = {
    publicPath: '/',
    outputDir: 'dist',
    devServer: {
      // Run the API alongside with: npm run server:dev
      proxy: {
        '/api': { target: 'http://127.0.0.1:8100' },
      },
    },
  };
