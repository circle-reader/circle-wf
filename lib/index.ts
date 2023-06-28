#!/usr/bin/env node

import inquirer from 'inquirer';
import { Command } from 'commander';
import pkg from '../package.json';
import checkVersion from './checkVersion';
import CreateProject from './workflow/create.class';

inquirer.registerPrompt(
  'autocomplete',
  require('inquirer-autocomplete-prompt')
);

(async () => {
  await checkVersion();

  const program = new Command();

  program.name(pkg.name).description(pkg.description).version(pkg.version);

  program
    .command('init', { isDefault: true })
    .description('quickly create a project.')
    .action(() => {
      new CreateProject().start();
    });

  program.parse();
})();
