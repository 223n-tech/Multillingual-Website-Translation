import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';

// ESモジュールで__dirnameを使用するための設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// マニフェストからバージョン情報を取得
const manifestPath = path.resolve(__dirname, 'src/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

// ビルド番号を生成
// package.jsonから現在のビルド番号を取得、存在しない場合は1から開始
const packageJsonPath = path.resolve(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let buildNumber = 1;

if (packageJson.buildNumber) {
  buildNumber = parseInt(packageJson.buildNumber, 10) + 1;
}

// package.jsonにビルド番号を書き込む
packageJson.buildNumber = buildNumber;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

// ビルド時のタイムスタンプ
const buildDate = new Date().toISOString();

// バージョン文字列を作成
const versionWithBuild = `${version}.${buildNumber}`;

console.log(`Building version: ${versionWithBuild} (${buildDate})`);

// ビルド情報ファイルを生成
const buildInfoContent = `export const BUILD_INFO = {
  version: '${version}',
  buildNumber: ${buildNumber},
  fullVersion: '${versionWithBuild}',
  buildDate: '${buildDate}',
};
`;

// buildInfo.tsファイルを作成
const buildInfoPath = path.resolve(__dirname, 'src/utils/buildInfo.ts');
fs.writeFileSync(buildInfoPath, buildInfoContent, 'utf8');

// ビルド情報のJSファイルを生成
const buildInfoRuntimeTemplate = fs.readFileSync(
  path.resolve(__dirname, 'src/utils/buildInfoRuntime.js.template'),
  'utf8',
);

// テンプレート内の変数を置換
const buildInfoRuntimeContent = buildInfoRuntimeTemplate
  .replace(/<%- version %>/g, version)
  .replace(/<%- buildNumber %>/g, buildNumber.toString())
  .replace(/<%- versionWithBuild %>/g, versionWithBuild)
  .replace(/<%- buildDate %>/g, buildDate);

// buildInfoLoader.jsファイルも読み込む
const buildInfoLoaderPath = path.resolve(__dirname, 'src/utils/buildInfoLoader.js');
const buildInfoLoaderContent = fs.readFileSync(buildInfoLoaderPath, 'utf8');

export default {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    popup: './src/popup/index.ts',
    options: './src/options/index.ts',
    'entry-manager': './src/options/entry-manager/index.ts',
    'build-info-loader': './src/utils/buildInfoLoader.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json',
          transform(content) {
            // マニフェストファイルのバージョンを更新
            const manifestJson = JSON.parse(content.toString());
            manifestJson.version = versionWithBuild;
            return JSON.stringify(manifestJson, null, 2);
          },
        },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
        {
          from: 'src/utils/buildInfoRuntime.js.template',
          to: 'buildInfoRuntime.js',
          transform(content) {
            return content
              .toString()
              .replace(/<%- version %>/g, version)
              .replace(/<%- buildNumber %>/g, buildNumber.toString())
              .replace(/<%- versionWithBuild %>/g, versionWithBuild)
              .replace(/<%- buildDate %>/g, buildDate);
          },
        },
        // 追加のCSSファイルをコピー
        {
          from: 'src/options/entry-manager/entry-manager.css',
          to: 'entry-manager.css',
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup', 'build-info-loader'],
      templateParameters: {
        version: versionWithBuild,
        buildDate: buildDate,
      },
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options.html',
      chunks: ['options', 'build-info-loader'],
      templateParameters: {
        version: versionWithBuild,
        buildDate: buildDate,
      },
      inject: 'body',
    }),
    new HtmlWebpackPlugin({
      template: './src/options/entry-manager/entry-manager.html',
      filename: 'entry-manager.html',
      chunks: ['entry-manager', 'build-info-loader'],
      templateParameters: {
        version: versionWithBuild,
        buildDate: buildDate,
      },
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  devtool: 'source-map',
};
