#!/usr/bin/env node

import figlet from 'figlet';
import inquirer from 'inquirer';
import { Command } from 'commander';
import inquirerprompt from 'inquirer-autocomplete-prompt';
import checkVersion from './checkVersion.js';
import CreateProject from './workflow/create.class.js';
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

  program.parse();
})();
