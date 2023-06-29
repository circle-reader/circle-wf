import shell from 'shelljs';
import Base from './base.class.js';

// 如果shell出错则结束
shell.config.fatal = true;

export default class DevProject extends Base {
  constructor() {
    super('dev');
  }

  process() {
    this.loading();
    return new Promise((reslove) => {
      shell.exec('yarn dev');
      reslove(true);
    });
  }
}
