import fs from 'fs';
import path from 'path';
import axios from 'axios';
import inquirer from 'inquirer';
import download from 'download';
import spawn from 'cross-spawn';
import Base from './base.class.js';
import { createRequire } from 'module';
import { registry } from '../config.js';

const require = createRequire(import.meta.url);

interface IProject {
  package: {
    name: string;
    version: string;
    description?: string;
  };
}

const search = 'circle-template-';

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
    this.loading('准备中...');
    return axios
      .get(`${registry}/-/v1/search?text=${search}`)
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
          return Promise.reject('未发现任何模版');
        }
        return inquirer.prompt([
          {
            name: 'repo',
            // @ts-ignore
            type: 'autocomplete',
            message: '请选择一个模版',
            source: async (answers: any, input: string) => {
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
                name: `${project.package.name} ${project.package.description}`,
                short: project.package.name,
                value: `${project.package.name}/${project.package.version}`,
              }));
            },
          },
          {
            name: 'dir',
            type: 'input',
            message: '请输入目标文件夹名称(输入 . 代表当前目录)',
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
            this.warn('目标文件夹已经存在文件（.git除外）:');
            fileList.forEach((file: string) => {
              this.warn(`- ${file}`);
            });
            inquirer
              .prompt({
                name: 'shouldContinue',
                type: 'confirm',
                message: '已存在的文件将被覆盖. 是否继续?',
              })
              .then(({ shouldContinue }: { shouldContinue: boolean }) => {
                if (!shouldContinue) {
                  process.exit();
                }
              });
          }
        }
        this.loading('项目加载中...');
        return axios.get(`${registry}/${repo}`).then((returnValue: any) => {
          const result = returnValue.data;
          if (result.dist && result.dist.tarball) {
            return download(result.dist.tarball, dir, {
              strip: 1,
              extract: true,
            }).then(() => {
              this.stopLoading();
              return Promise.resolve(targetDir);
            });
          }
          this.stopLoading();
          return Promise.reject('未发现模版项目');
        });
      })
      .then((dir: string) => {
        this.stopLoading();
        this.renameDirName(dir);
        this.success('项目已创建');
        return new Promise((resolve, reject) => {
          this.info('依赖安装中...');
          const ps = spawn('yarn', [], { cwd: dir, stdio: 'inherit' });
          ps.on('close', (code: number) => {
            if (code !== 0) {
              this.error('依赖自动安装失败，你可以通过 "yarn" 命令手动安装');
              reject();
            } else {
              this.success(
                `已完成所有工作，接下来就交给你了! 你或许会对 ${registry}/.zip 感兴趣`
              );
              resolve(true);
            }
          });
        });
      });
  }
}
