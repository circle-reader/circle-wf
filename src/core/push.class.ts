import fs from 'fs';
import path from 'path';
import axios from 'axios';
import shell from 'shelljs';
import { MAP } from '../config.js';
import Base, { IProps } from './base.class.js';

export default class PushProject extends Base {
  constructor(args: IProps) {
    super({ args, name: 'pushProject' });
  }

  start() {
    const platform = this.props.args.platform;
    if (!platform || !MAP[platform]) {
      this.error('platform error');
      return;
    }
    const target = `${process.cwd()}/build`;
    if (!fs.existsSync(target)) {
      this.error('please build first');
      return;
    }
    if (!shell.which('git')) {
      this.error(`git not found`);
      return;
    }
    const PUSHCMD = ['git push'];
    (MAP[platform].target
      ? new Promise((reslove, reject) => {
          // @ts-ignore
          const dist: string = MAP[platform].target;
          fs.cpSync(target, dist, {
            force: true,
            recursive: true,
          });
          const pwd = path.resolve(dist, '../');
          PUSHCMD.unshift(`cd ${pwd}`);
          Promise.all(
            ['git add .', 'git commit -m "feat(app): update app in root"'].map(
              (cmd) =>
                new Promise((res, rej) => {
                  shell.exec(`cd ${pwd} && ${cmd}`, (code, stdout, stderr) => {
                    if (code !== 0) {
                      rej(stderr);
                      return;
                    }
                    res(stdout);
                  });
                })
            )
          )
            .then(reslove)
            .catch(reject);
        })
      : Promise.resolve()
    )
      .then(() => {
        this.loading('push...');
        return new Promise((resolve, reject) => {
          shell.exec(PUSHCMD.join(' && '), (code, stdout, stderr) => {
            this.stopLoading();
            if (code !== 0) {
              reject(stderr);
              return;
            }
            this.info(stdout);
            this.loading('\ndeploy...');
            axios
              .post(MAP[platform].app, { action: 'pull' })
              .then((data: any) => {
                if (data && data.error) {
                  reject(data.error);
                  return;
                }
                resolve(data.data);
              })
              .catch(reject)
              .finally(() => {
                this.stopLoading();
              });
          });
        });
      })
      .then((data) => {
        // @ts-ignore
        this.success(data);
      })
      .catch((err) => {
        this.error(err && err.message ? err.message : err);
      });
  }
}
