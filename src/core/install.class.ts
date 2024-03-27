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
    const args = this.props.args || {};
    const force = !!args.force;
    Promise.all(
      items.map((item) => {
        return force
          ? new Promise((reslove) => {
              const nodePath = this.path(`${item}/node_modules`);
              if (fs.existsSync(nodePath)) {
                fs.rmSync(nodePath, { recursive: true });
              }
              reslove(item);
            })
          : Promise.resolve(item);
      })
    )
      .then((items) => {
        const install = () => {
          const item = items.pop();
          if (item) {
            this.info(`Install dependencies for ${item}`);
            const shellWithoutSudo = shell.exec(`cd ${item} && pnpm install`);
            if (shellWithoutSudo.code !== 0) {
              this.error(`${items.join(',')} install fail`);
            } else {
              install();
            }
          } else {
            this.success("All the work has been done, it's up to you!");
          }
        };
        install();
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
