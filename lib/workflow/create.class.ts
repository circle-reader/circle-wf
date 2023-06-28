import fs from 'fs';
import path from 'path';
import axios from 'axios';
import inquirer from 'inquirer';
import download from 'download';
import spawn from 'cross-spawn';
import Base from './base.class';
import { projects, repository } from '../config';

interface IProject {
  id: number;
  description: string;
  name: string;
  data: Array<{
    name: string;
    description: string;
  }>;
}

export default class CreateProject extends Base {
  constructor() {
    super('init');
  }

  private renameDirName(dir: string) {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = require(pkgPath);
    pkg.name = path.basename(dir);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  process() {
    this.loading('Loading template list...');
    return axios
      .get(projects)
      .then((result: { data: Array<IProject> }) => {
        this.stopLoading();
        return inquirer.prompt([
          {
            name: 'repo',
            // @ts-ignore
            type: 'autocomplete',
            message: 'Please select a template.',
            source: async (answers: any, input: string) => {
              const projects = input
                ? result.data.filter(
                    (project) =>
                      project.name.includes(input) ||
                      project.description.includes(input)
                  )
                : result.data;
              return projects.map((project) => ({
                name: `${project.name} ${project.description}`,
                short: project.name,
                value: project.id,
              }));
            },
          },
          {
            name: 'dir',
            type: 'input',
            message:
              'Please input the target directory("." means current directory)',
            default: '.',
            validate: (input: string) => !!input,
          },
        ]);
      })
      .then(({ repo, dir }: { repo: string; dir: string }) => {
        const targetDir = path.resolve(process.cwd(), dir);
        if (fs.existsSync(targetDir)) {
          const fileList = fs.readdirSync(targetDir).filter((file: string) => {
            // ignore .git dir, maybe it is a empty git repo
            return file !== '.git';
          });
          if (fileList.length > 0) {
            this.warn('The target dir is NOT empty(except .git):');
            fileList.forEach((file: string) => {
              this.warn(`- ${file}`);
            });
            inquirer
              .prompt({
                name: 'shouldContinue',
                type: 'confirm',
                message:
                  'The file(s) above will be overwritten. Do you want to continue?',
              })
              .then(({ shouldContinue }: { shouldContinue: boolean }) => {
                if (!shouldContinue) {
                  process.exit();
                }
              });
          }
        }
        this.loading('Downloading template...');
        return download(repository.replace('_repo_', repo), dir, {
          strip: 1,
          extract: true,
        }).then(() => Promise.resolve(targetDir));
      })
      .then((dir: string) => {
        this.stopLoading();
        this.renameDirName(dir);
        this.success('Project is created!');
        return new Promise((resolve, reject) => {
          this.info('Installing dependencies...');
          const ps = spawn('yarn', [], { cwd: dir, stdio: 'inherit' });
          ps.on('close', (code: number) => {
            if (code !== 0) {
              this.error(
                'Installing dependencies FAILED. You can try again later, then use commands:'
              );
              reject();
            } else {
              this.success('Project is created. Have fun!');
              resolve(true);
            }
          });
        });
      });
  }
}
