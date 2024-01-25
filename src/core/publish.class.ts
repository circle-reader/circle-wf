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
    super({ name: 'publishProject', args });
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
            name: 'username',
            type: 'input',
            message: 'please enter your username',
            validate: (input) => {
              return !!input;
            },
          },
          {
            name: 'password',
            type: 'input',
            message: 'Please enter password',
            validate: (input) => {
              return !!input;
            },
          },
        ])
        .then(({ username, password }) => {
          return axios
            .get('http://localhost/api/user/get', {
              timeout: 10000,
              headers: {
                'Content-Type': 'application/json',
                token: Buffer.from(
                  `${username.trim()}__token__${password.trim()}`
                ).toString('base64'),
              },
            })
            .then((res) => {
              if (res.data.id && res.data.access_token) {
                fs.writeFileSync(configFilePath, JSON.stringify(res.data));
                return Promise.resolve(res.data);
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
      } else {
        if (
          !Array.isArray(mainfest.settings) ||
          mainfest.settings.length <= 0
        ) {
          reject('The format is incorrect, please check');
          return;
        }
      }
      resolve(mainfest);
    }).then((plugin) => {
      return this.token().then(({ uid, access_token }) => {
        this.loading('uploading');
        axios
          .post('http://localhost/api/apps/publish', plugin, {
            headers: {
              id: uid,
              token: access_token,
              'Content-Type': 'application/json',
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
                'Verification failed, please try again to enter username and password verification'
              );
            } else {
              this.error(
                Array.isArray(err.response.data)
                  ? err.response.data.join(' ')
                  : err.response.data
              );
            }
          });
      });
    });
  }
}
