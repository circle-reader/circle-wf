import shell from 'shelljs';
import Base from './base.class.js';

export default class BuildProject extends Base {
  constructor() {
    super('build');
  }

  process() {
    this.loading('准备中...');
    return new Promise((reslove) => {
      shell.exec('yarn build');
      reslove(true);
    });
  }
}
