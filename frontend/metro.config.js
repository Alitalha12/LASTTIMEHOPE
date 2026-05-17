const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// 2. Disable unstable package exports to force standard React Native resolution for Firebase
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
