/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

//***************************************************************
// this is a babel plugin; will be part of babel so cannot be ES6
// that's why you must provide es5 files (under 'dist' folder)
const BabelPluginRelay = require('../../dist/babel-plugin-relay');
//***************************************************************

const assign = require('object-assign');
const babel = require('babel-core');
const createCacheKeyFunction = require('fbjs-scripts/jest/createCacheKeyFunction');
const getBabelOptions = require('../getBabelOptions');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '../../packages/relay-compiler/testutils/testschema.graphql');

const babelOptions = getBabelOptions({
  env: 'test',
  moduleMap: {
    'React': 'react',
    'reactComponentExpect': 'react-dom/lib/reactComponentExpect',
    'ReactDOM': 'react-dom',
    'ReactDOMServer': 'react-dom/server',
    'ReactTestRenderer': 'react-test-renderer',
    'ReactTestUtils': 'react-dom/test-utils',
    'StaticContainer.react': 'react-static-container',
  },
  plugins: [
    [BabelPluginRelay, {
      compat: true,
      haste: true,
      relayQLModule: 'RelayQL',
      substituteVariables: true,
      schema: SCHEMA_PATH,
    }],
    require('babel-plugin-transform-async-to-generator'),
  ],
});

module.exports = {
  process: function(src, filename) {
    const options = assign({}, babelOptions, {
      filename: filename,
      retainLines: true,
      sourceMaps: 'inline',
    });
    return babel.transform(src, options).code;
  },

  getCacheKey: createCacheKeyFunction([
    __filename,
    SCHEMA_PATH,
    path.join(path.dirname(require.resolve('babel-preset-fbjs')), 'package.json'),
    path.join(__dirname, '..', 'getBabelOptions.js'),
  ]),
};
