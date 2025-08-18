const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve = {
    ...config.resolve,
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
    }
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
