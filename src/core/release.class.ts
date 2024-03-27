import fs from 'fs';
import shell from 'shelljs';
import Task from './task.class.js';

export default class ReleaseProject extends Task {
  constructor(args: any) {
    super({ args, name: 'releaseProject' });
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
    const release = () => {
      const item = items.pop();
      if (item) {
        this.info(`Building ${item}`);
        const build = shell.exec(`cd ${item} && circle build`);
        if (build.code !== 0) {
          this.error(`${item} build fail`);
          return;
        }
        const publish = shell.exec(`cd ${item} && circle publish`);
        if (publish.code !== 0) {
          this.error(`${item} publish fail`);
          return;
        }
        release();
      } else {
        this.success("All the work has been done, it's up to you!");
      }
    };
    release();
  }
}
