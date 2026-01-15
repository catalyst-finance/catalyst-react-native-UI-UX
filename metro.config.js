// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// NativeWind configuration
const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
