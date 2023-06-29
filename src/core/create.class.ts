import fs from 'fs';
import path from 'path';
import axios from 'axios';
import shell from 'shelljs';
import inquirer from 'inquirer';
import download from 'download';
import Base from './base.class.js';

interface IProject {
  package: {
    name: string;
    version: string;
    description?: string;
  };
}

const search = 'circle-template-';

export default class CreateProject extends Base {
  constructor(args: any) {
    super({ name: 'createProject', args });
  }

  private updatePkg(dir: string) {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = this.require(pkgPath, false, true);
    pkg.name = path.basename(dir);
    pkg.version = '1.0.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  start() {
    this.loading();
    axios
      .get(`${this.registry}/-/v1/search?text=${search}`)
      .then((returnValue: any) => {
        const result: { objects: Array<IProject> } = returnValue.data;
        this.stopLoading();
        const templates =
          Array.isArray(result.objects) && result.objects.length > 0
            ? result.objects.filter(
                (project) =>
                  project.package &&
                  project.package.name &&
                  project.package.name.startsWith(search)
              )
            : [];
        if (templates.length <= 0) {
          return Promise.reject('No templates found');
        }
        return inquirer.prompt([
          {
            name: 'repo',
            // @ts-ignore
            type: 'autocomplete',
            message: 'Please select a template',
            source: (answers: any, input: string) => {
              const projects = input
                ? templates.filter((project) => {
                    if (
                      project.package.name &&
                      project.package.name.includes(input)
                    ) {
                      return true;
                    }
                    if (
                      project.package.description &&
                      project.package.description.includes(input)
                    ) {
                      return true;
                    }
                    return false;
                  })
                : templates;
              return projects.map((project) => ({
                name: `${project.package.name}${
                  project.package.description
                    ? ' ' + project.package.description
                    : ''
                }`,
                short: project.package.name,
                value: `${project.package.name}/${project.package.version}`,
              }));
            },
          },
          {
            name: 'dir',
            type: 'input',
            message:
              'Please enter the destination folder (. represents the current directory)',
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
            this.warn('Destination folder already has files (except .git):');
            fileList.forEach((file: string) => {
              this.warn(`- ${file}`);
            });
            return inquirer
              .prompt({
                name: 'shouldContinue',
                type: 'confirm',
                message: 'Existing files will be covered. Continue?',
              })
              .then(({ shouldContinue }: { shouldContinue: boolean }) => {
                if (!shouldContinue) {
                  process.exit();
                }
                return Promise.resolve({ repo, dir, targetDir });
              });
          }
        }
        return Promise.resolve({ repo, dir, targetDir });
      })
      .then(({ repo, dir, targetDir }) => {
        this.loading('Project loading...');
        return axios
          .get(`${this.registry}/${repo}`)
          .then((returnValue: any) => {
            const result = returnValue.data;
            if (result.dist && result.dist.tarball) {
              return download(result.dist.tarball, dir, {
                strip: 1,
                extract: true,
              }).then(() => {
                this.stopLoading();
                return Promise.resolve({ dir, targetDir });
              });
            }
            this.stopLoading();
            return Promise.reject('No templates found');
          });
      })
      .then(({ dir, targetDir }) => {
        this.stopLoading();
        this.updatePkg(targetDir);
        ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'].forEach((lock) => {
          const lockFile = path.join(targetDir, lock);
          fs.existsSync(lockFile) && fs.rmSync(lockFile, { force: true });
        });
        this.success('Project created');
        const gitFile = path.join(targetDir, '.git');
        if (fs.existsSync(gitFile)) {
          fs.rmSync(gitFile, { recursive: true, force: true });
        }
        const ignore = path.join(targetDir, '.gitignore');
        if (!fs.existsSync(ignore)) {
          fs.writeFileSync(
            ignore,
            ['dist', 'node_modules', 'src/.circle'].join('\n')
          );
        }
        const args = this.props.args || {};
        const pmrInput = args.packageManager;
        let pmr = '';
        const defaultPmr = ['pnpm', 'yarn', 'npm'];
        if (defaultPmr.includes(pmrInput)) {
          pmr = pmrInput;
        } else {
          pmr = defaultPmr.find((item) => !!shell.which(item)) || '';
        }
        if (!pmr) {
          this.error(
            'npm yarn pnpm not found, please install any package management tool first'
          );
          return;
        }
        if (shell.which('git')) {
          shell.exec(`cd ${dir} && git init`);
        } else {
          this.success(
            `The project build is complete. It is detected that git is not installed, so the dependency installation is not performed. You can install the dependency by executing "cd ${dir} && ${pmr} install" after installing git, or delete the scripts.prepare field of the package.json file and perform the dependency installation`
          );
          return;
        }
        this.info('Install dependencies...');
        if (shell.exec(`cd ${dir} && ${pmr} install`).code !== 0) {
          this.error(
            `The automatic installation of dependency failed, you can install it manually with the "cd ${dir} && ${pmr} install" command`
          );
        } else {
          this.success("All the work has been done, it's up to you!");
        }
      })
      .catch((err) => {
        this.error(err);
      });
  }
}
