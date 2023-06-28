import ora from 'ora';
import { consola } from 'consola';

export default class Base {
  private name: string;
  private spinner = ora('Loading...');

  constructor(name: string) {
    this.name = name;
  }

  info(msg: string) {
    consola.info(msg);
  }

  warn(msg: string) {
    consola.warn(msg);
  }

  success(msg: string) {
    consola.success(msg);
  }

  error(msg: string) {
    consola.error(new Error(msg));
  }

  loading(text = 'Loading...') {
    this.spinner.text = text;
    this.spinner.start();
  }

  stopLoading() {
    this.spinner.stop();
  }

  start(...args: any[]) {
    this.beforeAll();
    try {
      this.process(...args).then(this.afterAll);
    } catch (e) {
      this.afterAll();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(...args: any[]): Promise<any> {
    return Promise.resolve();
  }

  beforeAll() {}

  afterAll() {
    this.stopLoading();
  }
}
