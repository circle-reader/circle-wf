#!/usr/bin/env node
const pkg = require('../package.json');

require('ts-node').register({
  project: require.resolve('../tsconfig.json'),
  transpileOnly: true,
  ignore: [`(?:^|/)node_modules/(?!(@.+/)?${pkg.name})`],
});

require('../lib/index');
