// MapLibre 지도 라이브러리를 앱 안에 넣기 위해 .txt 파일을 에셋으로 묶는다(통신 없이도 지도 화면이 뜬다).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('txt');

module.exports = config;
