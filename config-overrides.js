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

  // Force disable ESLint warnings as errors
  const eslintRule = config.module.rules.find(
    rule => rule.use && rule.use.some(use => use.loader && use.loader.includes('eslint'))
  );
  
  if (eslintRule) {
    eslintRule.use = eslintRule.use.filter(use => 
      !(use.loader && use.loader.includes('eslint'))
    );
  }
  
  // Alternative: completely remove ESLint from webpack config
  config.module.rules = config.module.rules.filter(rule => 
    !(rule.test && rule.test.toString().includes('\\.(js|mjs|jsx|ts|tsx)$') && 
      rule.use && rule.use.some(use => use.loader && use.loader.includes('eslint')))
  );

  return config;
};
