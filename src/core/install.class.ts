import fs from 'fs';
import shell from 'shelljs';
import Base from './base.class.js';

export default class InstallProject extends Base {
  constructor(args: any) {
    super({
      args,
      name: 'installProject',
    });
  }

  start() {
    const node = process.cwd() + '/node_modules';
    if (fs.existsSync(node)) {
      fs.rmSync(node, { recursive: true });
    }
    const items = fs
      .readdirSync(process.cwd())
      .filter((item) => fs.lstatSync(this.path(item)).isDirectory());
    if (items.length <= 0) {
      return;
    }
    Promise.all(
      items.map((item) => {
        return new Promise((reslove) => {
          const nodePath = this.path(`${item}/node_modules`);
          if (fs.existsSync(nodePath)) {
            fs.rmSync(nodePath, { recursive: true });
          }
          reslove(item);
        });
      })
    )
      .then((items) => {
        items.forEach((item) => {
          this.info(`Install dependencies for ${item}`);
          shell.exec(`cd ${item} && pnpm install`);
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
