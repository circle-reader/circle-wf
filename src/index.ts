#!/usr/bin/env node

import figlet from 'figlet';
import inquirer from 'inquirer';
import { Command } from 'commander';
import inquirerprompt from 'inquirer-autocomplete-prompt';
import checkVersion from './checkVersion.js';
import CreateProject from './core/create.class.js';
import DevProject from './core/dev.class.js';
import BuildProject from './core/build.class.js';
import PublishProject from './core/publish.class.js';
import { name, version, description } from './config.js';

inquirer.registerPrompt('autocomplete', inquirerprompt);

(async () => {
  await checkVersion();

  const program = new Command();

  console.log(figlet.textSync('Circle'));

  program.name(name).description(description).version(version);

  program
    .command('init', { isDefault: true })
    .description('创建一个应用项目')
    .action(() => {
      new CreateProject().start();
    });

  program
    .command('dev')
    // .option('--port <port>', 'the port of dev server(default 3000).')
    // .option('--browserslist-env <browserslistEnv>', 'the browserslist env.')
    .description('使用本地服务开发')
    .action((...args) => {
      new DevProject().start(...args);
    });

  program
    .command('build')
    // .option(
    //   '--reserve-output-path',
    //   'whether to reserve output path before building (default false).',
    //   false
    // )
    .description('构建当前项目')
    .action((...args) => {
      new BuildProject().start(...args);
    });

  program
    .command('publish')
    .description('提交至应用商店')
    .action(() => {
      new PublishProject();
    });

  program.parse();
})();
