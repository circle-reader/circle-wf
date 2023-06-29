import Base, { IProps } from './base.class.js';

interface IPackage {
  name: string;
  version: string;
  description?: string;
  _type?: string;
  runDependencies?: string | string[];
  author?:
    | string
    | {
        name: string;
        email?: string;
        url?: string;
      };
  [index: string]: any;
}

export default class Task extends Base {
  protected pkg: IPackage;

  constructor(props: IProps) {
    super(props);
    this.pkg = {
      name: 'circle',
      version: '1.0.0',
    };
  }

  start() {
    const pkg = this.require('package.json');
    if (!pkg) {
      this.error(
        'No package.json found, please run the program in the project'
      );
      return;
    }
    this.pkg = pkg;
    this.beforeAll();
    this.process(this.props.args)
      .then((...returnArgs: any) => {
        this.afterAll(...returnArgs);
      })
      .catch((err) => {
        this.error(err);
        this.afterAll(err);
      })
      .finally(() => {
        this.stopLoading();
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process(...args: any[]): Promise<any> {
    return Promise.resolve();
  }

  beforeAll() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterAll(...args: any[]) {}
}
