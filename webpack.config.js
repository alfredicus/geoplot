const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');
const ROOT = path.resolve(__dirname, 'src');
const DESTINATION = path.resolve(__dirname, 'dist');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');


module.exports = {
    context: ROOT,
    entry: {
        'main': './index.ts'
    },
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                        pure_funcs: ['console.log']
                    },
                    format: {
                        comments: false,
                    },
                    mangle: true
                },
                extractComments: false,
            }),
        ],
        splitChunks: {
            chunks: 'all',
            minSize: 20000,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            cacheGroups: {
                defaultVendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                }
            }
        }
    },
    output: {
        path: DESTINATION,
        libraryTarget: 'umd',
        umdNamedDefine: true,
        library: pkg.name,
        filename: pkg.name + ".js",
        globalObject: `(typeof self !== 'undefined' ? self : this)`
    },
    resolve: {
        extensions: ['.ts', 'tsx', '.js'],
        modules: [
            ROOT,
            'node_modules'
        ]
    },
    externals: [{
        '@youwol/dataframe': "@youwol/dataframe",
        '@youwol/math': "@youwol/math",
        'd3': "d3",
        'xlsx': "xlsx"
    }],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    { loader: 'ts-loader' },
                ],
                exclude: /node_modules/,
            }
        ],
    },
    devtool: 'source-map',
    plugins: [
        new BundleAnalyzerPlugin()
    ]
};