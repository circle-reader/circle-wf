import axios from 'axios';
import shell from 'shelljs';
import figlet from 'figlet';
import inquirer from 'inquirer';
import { Command } from 'commander';
import inquirerprompt from 'inquirer-autocomplete-prompt';
import Base from './base.class.js';
import DevProject from './dev.class.js';
import BuildProject from './build.class.js';
import CreateProject from './create.class.js';
import PublishProject from './publish.class.js';

inquirer.registerPrompt('autocomplete', inquirerprompt);

interface IPackage {
  name: string;
  version: string;
  description: string;
  [index: string]: any;
}

export default class App extends Base {
  private pkg: IPackage;

  constructor() {
    super({ name: 'app' });
    this.pkg = this.require('package.json', true);
  }

  checkVersion() {
    // 20% 的概率检查版本
    if (this.debug || Math.random() > 0.2) {
      return Promise.resolve();
    }
    return axios
      .get(`${this.registry}/${encodeURIComponent(this.pkg.name)}`, {
        timeout: 3000,
      })
      .then((repo) => {
        const latestVersion =
          repo.data['dist-tags'] && repo.data['dist-tags'].latest
            ? repo.data['dist-tags'].latest
            : false;
        if (latestVersion && latestVersion === this.pkg.version) {
          return Promise.resolve();
        }
        return inquirer
          .prompt([
            {
              name: 'update',
              type: 'confirm',
              message:
                'A new version is released, should it be updated immediately?',
            },
          ])
          .then(({ update }) => {
            if (!update) {
              return Promise.resolve();
            }
            this.info('Updated version...');
            const { code } = shell.exec(`npm install -g ${this.pkg.name}`);
            if (code !== 0) {
              this.warn('Update version failed, skip...');
            }
            return Promise.resolve();
          });
      })
      .catch(() => {
        return Promise.resolve();
      });
  }

  start() {
    this.checkVersion().then(() => {
      const program = new Command();

      program
        .name(this.pkg.name)
        .version(this.pkg.version)
        .description(this.pkg.description);

      program
        .command('default', { isDefault: true, hidden: true })
        .description('Default Command to Show help')
        .action(() => {
          console.log(figlet.textSync('Circle'));
          program.help();
        });

      program
        .command('init')
        .description('Create project')
        .option(
          '-pmr, --package-manager [name]',
          'Package management tools used'
        )
        .action((args) => {
          new CreateProject(args).start();
        });

      program
        .command('dev')
        .description('Use local service development')
        .option('-sp, --separate', 'Separate plugin configuration and content')
        .action((args) => {
          new DevProject(args).start();
        });

      program
        .command('build')
        .description('Build the current project')
        .option('-sp, --separate', 'Separate plugin configuration and content')
        .action((args) => {
          new BuildProject(args).start();
        });

      program
        .command('publish')
        .description('Publish to App Store')
        .action((args) => {
          new PublishProject(args).start();
        });

      program.parse();
    });
  }
}
