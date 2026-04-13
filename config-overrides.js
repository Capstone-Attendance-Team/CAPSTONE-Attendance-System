
const { override, addWebpackModuleRule, addBabelPlugin } = require('customize-cra');

const addNodePolyfills = () => (config) => {
  if (!config.resolve) config.resolve = {};
  if (!config.resolve.fallback) config.resolve.fallback = {};
  config.resolve.fallback.fs = false;
  return config;
};

const addModernJSXTransform = () => (config) => {
  const babelLoader = config.module.rules.find(
    rule => rule.loader && rule.loader.includes('babel-loader')
  );
  if (babelLoader) {
    babelLoader.options.presets = [
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-env'
    ];
  }
  return config;
};

module.exports = override(
  addWebpackModuleRule({
    test: /face-api.js[\\/].*\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
  }),
  addModernJSXTransform(),
  addNodePolyfills()
);
