const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');
const pak = require('../package.json');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const base = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

module.exports = mergeConfig(base, {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Always consume the library from TypeScript source in the example app.
      if (moduleName === pak.name || moduleName.startsWith(`${pak.name}/`)) {
        return {
          filePath: path.join(root, 'src', 'index.tsx'),
          type: 'sourceFile',
        };
      }

      if (base.resolver?.resolveRequest) {
        return base.resolver.resolveRequest(context, moduleName, platform);
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
