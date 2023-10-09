module.exports = {
    devServer: {
      proxy: 'http://localhost:8080',
    },
    configureWebpack: {
      resolve: {
        fallback: {
          stream: require.resolve('stream-browserify'),
          path: require.resolve('path-browserify'),
          os: require.resolve('os-browserify/browser'),
          crypto: require.resolve('crypto-browserify'),
        },
      },
    },
  };
  