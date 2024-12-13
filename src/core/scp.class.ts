import fs from 'fs';
import axios from 'axios';
import shell from 'shelljs';
import { MAP } from '../config.js';
import Base, { IProps } from './base.class.js';

export default class DeployProject extends Base {
  constructor(args: IProps) {
    super({ args, name: 'deployProject' });
  }

  start() {
    const platform = this.props.args.platform;
    if (!platform || !MAP[platform]) {
      this.error('platform error');
      return;
    }
    const target = `${process.cwd()}/zip/dist.zip`;
    if (!fs.existsSync(target)) {
      this.error('please build first');
      return;
    }
    if (!shell.which('scp')) {
      this.error(`scp not found`);
      return;
    }
    this.loading('scp...');
    shell.exec(
      `scp ${target} ${MAP[platform].data}`,
      (code, stdout, stderr) => {
        this.stopLoading();
        if (code !== 0) {
          this.error(stderr);
          return;
        }
        this.info(stdout);
        this.loading('\ndeploy...');
        axios
          .post(MAP[platform].app, { action: 'scp' })
          .then((data: any) => {
            if (data && data.error) {
              this.error(data.error);
              return;
            }
            shell.rm('-rf', `${process.cwd()}/zip`);
            this.success(data.data);
          })
          .catch((err) => {
            this.error(err && err.message ? err.message : err);
          })
          .finally(() => {
            this.stopLoading();
          });
      }
    );
  }
}
