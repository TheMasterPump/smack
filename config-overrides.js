const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve = {
    ...config.resolve,
    alias: {
      ...(config.resolve.alias || {}),
      "process/browser": require.resolve("process/browser.js"),
    },
    fallback: {
      ...(config.resolve ? config.resolve.fallback : {}),
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      process: require.resolve("process/browser.js"),
      buffer: require.resolve("buffer"),
      assert: require.resolve("assert"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      url: require.resolve("url"),
      vm: require.resolve("vm-browserify"),
    }
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  // Disable ESLint warnings as errors in production
  if (process.env.NODE_ENV === 'production') {
    config.module.rules.forEach(rule => {
      if (rule.use && rule.use.some(use => use.loader && use.loader.includes('eslint-loader'))) {
        rule.use.forEach(use => {
          if (use.loader && use.loader.includes('eslint-loader')) {
            use.options = use.options || {};
            use.options.emitWarning = true;
            use.options.failOnError = false;
          }
        });
      }
    });
  }

  return config;
};
