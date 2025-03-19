import fs from 'fs';
import os from 'os';
import path from 'path';
import axios from 'axios';
import shell from 'shelljs';
import inquirer from 'inquirer';
import Task from './task.class.js';

export default class PublishProject extends Task {
  private root: string;

  constructor(args: any) {
    super({ args, name: 'publishProject' });
    this.root = this.path('dist');
  }

  private configFilePath() {
    const homedir = os.homedir();
    return path.resolve(homedir, '.circle.json');
  }

  private token() {
    const configFilePath = this.configFilePath();
    if (!fs.existsSync(configFilePath)) {
      return inquirer
        .prompt([
          {
            name: 'mail',
            type: 'input',
            validate: (val) => !!val,
            message: 'please enter your email',
          },
          {
            name: 'pass',
            type: 'input',
            validate: (val) => !!val,
            message: 'Please enter password',
          },
        ])
        .then(({ mail, pass }) => {
          return axios
            .post(
              'https://circlereader.com/api/circle/login',
              { mail, pass },
              {
                timeout: 10000,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )
            .then((res) => {
              if (res.data.data.access_token) {
                fs.writeFileSync(configFilePath, JSON.stringify(res.data.data));
                return Promise.resolve(res.data.data);
              } else {
                this.error('Server error, please try again later');
              }
              return shell.exit();
            });
        });
    } else {
      try {
        const data = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
        if (!data.access_token) {
          return shell.exit();
        }
        return Promise.resolve(data);
      } catch (error: any) {
        return shell.exit();
      }
    }
  }

  process() {
    return new Promise((resolve, reject) => {
      const target = `${this.root}/${this.pkg.name}.json`;
      if (!fs.existsSync(this.root) || !fs.existsSync(target)) {
        reject('No information found, please build before proceeding');
        return;
      }
      const mainfest = JSON.parse(fs.readFileSync(target, 'utf8'));
      if (!mainfest.id || !mainfest.version) {
        reject('The format is incorrect, please check');
        return;
      }
      if (mainfest.type === 'plugin') {
        if (!mainfest.main) {
          reject('The format is incorrect, please check');
          return;
        }
      }
      // else {
      //   if (
      //     !Array.isArray(mainfest.settings) ||
      //     mainfest.settings.length <= 0
      //   ) {
      //     reject('The format is incorrect, please check');
      //     return;
      //   }
      // }
      resolve(mainfest);
    }).then((plugin) => {
      return this.token().then(({ uid, access_token }) => {
        this.loading('uploading');
        axios
          .post('https://circlereader.com/api/store/generate', plugin, {
            headers: {
              'X-Circle-Lang': 'zh-CN',
              'X-Circle-App': 'reader',
              'X-Circle-Version': '1.0.0',
              'Content-Type': 'application/json',
              'X-Circle-Token': `${access_token}*&~!${uid}`,
            },
          })
          .then(() => {
            this.stopLoading();
            this.success('The upload was successful and is under review. . .');
          })
          .catch((err) => {
            this.stopLoading();
            if (err.response.status == 401) {
              fs.rmSync(this.configFilePath(), {
                recursive: true,
                force: true,
              });
              this.error(
                'Verification failed, please try again to enter email and password verification'
              );
            } else {
              this.error(
                err.response.data.message
                  ? err.response.data.message
                  : err.response.data
              );
            }
          });
      });
    });
  }
}
