import fs from 'fs';
import ora from 'ora';
import path from 'path';
import { consola } from 'consola';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

export interface IProps {
  name: string;
  cwd?: string;
  args?: any;
}

export default class Base {
  private spinner = ora('');
  protected debug: boolean;
  protected props: IProps;
  protected registry: string;

  constructor(props: IProps) {
    this.props = props;
    this.debug = process.env.DEBUG === 'TRUE';
    this.registry = 'https://registry.npmjs.org';
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

  loading(text = 'Processing...') {
    this.spinner.text = text;
    this.spinner.start();
  }

  stopLoading() {
    this.spinner.stop();
  }

  require(dist: string, self?: boolean, redirect?: boolean) {
    const filePath = redirect ? dist : this.path(dist, self);
    if (!fs.existsSync(filePath)) {
      return;
    }
    return createRequire(import.meta.url)(filePath);
  }

  path(dist: string, self?: boolean) {
    const cwd = self
      ? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../')
      : this.props.cwd || process.cwd();
    return path.join(cwd, dist.startsWith('/') ? dist : `/${dist}`);
  }
}
