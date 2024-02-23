import fs from 'fs';
import Webpack from 'webpack';
import Base from './base.class.js';

export default class MakeProject extends Base {
  constructor(args: any) {
    super({
      args,
      name: 'makeProject',
    });
  }

  private _getEntry(item: string) {
    let index = '';
    [
      'index.tsx',
      'index.jsx',
      'index.ts',
      'index.class.ts',
      'index.class.js',
      'index.js',
    ].forEach((key) => {
      const entryPath = this.path(`${item}/src/${key}`);
      if (fs.existsSync(entryPath)) {
        index = key;
      }
    });
    return index;
  }

  private getEntry(item: string) {
    const index = this._getEntry(item);
    if (index) {
      return {
        index,
        entry: this.path(
          `${item}/src/.circle/autoConfig/entry.${index.split('.').pop()}`
        ),
      };
    }
    return { index: '', entry: '' };
  }

  private reactProject(entry: string) {
    return /\.(tsx|jsx)/.test(entry);
  }

  private afterAll(item: string) {
    const main = this.path(`${item}/dist/main.js`);
    if (!fs.existsSync(main)) {
      return;
    }
    const pkg = this.require(`${item}/package.json`);
    const appConfig: any = {
      id: pkg.name,
      type: pkg._type || 'plugin',
      version: pkg.version || '1.0.0',
    };
    [
      'title',
      'runAt',
      'core',
      'enabled',
      'priority',
      'homepage',
      'description',
    ].forEach((field) => {
      pkg[field] && (appConfig[field] = pkg[field]);
    });
    if (pkg._dependencies) {
      appConfig.dependencies = pkg._dependencies;
    }
    const index = this._getEntry(item);
    if (pkg.name !== 'display' && index && this.reactProject(index)) {
      if (appConfig.dependencies) {
        appConfig.dependencies = Array.isArray(appConfig.dependencies)
          ? appConfig.dependencies
          : [appConfig.dependencies];
      } else {
        appConfig.dependencies = [];
      }
      !appConfig.dependencies.includes('display') &&
        appConfig.dependencies.push('display');
    }
    if (pkg.author) {
      if (typeof pkg.author === 'string') {
        appConfig.author = pkg.author;
      } else if (typeof pkg.author === 'object') {
        const authorFields = [];
        if (pkg.author.name) {
          authorFields.push(pkg.author.name);
        }
        if (pkg.author.email) {
          authorFields.push(`<${pkg.author.email}>`);
        }
        if (pkg.author.url) {
          authorFields.push(`(${pkg.author.url})`);
        }
        appConfig.author = authorFields.join(' ');
      }
    }
    const settings = this.path(`${item}/settings.json`);
    if (fs.existsSync(settings)) {
      const setting = fs.readFileSync(settings, 'utf8');
      if (setting) {
        const settingData = JSON.parse(setting);
        if (Array.isArray(settingData) && settingData.length > 0) {
          appConfig.settings = {
            option: settingData,
          };
        } else if (Object.keys(settingData).length > 0) {
          appConfig.settings = settingData;
        }
      }
    }
    const i18n = this.path(`${item}/i18n`);
    if (fs.existsSync(i18n)) {
      const i18ns = fs
        .readdirSync(i18n)
        .filter((file: string) => file.endsWith('.json'))
        .map((file) => {
          const i18nString = fs.readFileSync(`${i18n}/${file}`, 'utf8');
          if (i18nString) {
            const i18nData = JSON.parse(i18nString);
            if (Object.keys(i18nData).length > 0) {
              return {
                key: file.replace(/(\/|\.json)/g, ''),
                value: i18nData,
              };
            }
          }
        })
        .filter((item) => !!item);

      if (i18ns.length > 0) {
        ['title', 'description'].forEach((field) => {
          if (appConfig[field]) {
            return;
          }
          let lost = false;
          i18ns.forEach(({ value }: any) => {
            if (lost) {
              return;
            }
            if (!value[field] || typeof value[field] !== 'string') {
              lost = true;
            }
          });
          if (!lost) {
            appConfig[field] = `__${field}__`;
          }
        });
        const values: {
          [index: string]: any;
        } = {};
        i18ns.forEach(({ key, value }: any) => {
          values[key] = value;
        });
        appConfig.i18n = values;
      }
    }
    if (!appConfig.title) {
      appConfig.title = appConfig.id;
    }
    const factory = fs.readFileSync(main, 'utf8');
    const mainFile = factory.replace('__PLUGIN_NAME__', pkg.name);
    fs.writeFileSync(
      this.path(`${item}/dist/${pkg.name}.json`),
      JSON.stringify(appConfig, null, 2)
    );
    fs.writeFileSync(this.path(`${item}/dist/${pkg.name}.js`), mainFile);
    fs.rmSync(main);
  }

  start() {
    const items = fs
      .readdirSync(process.cwd())
      .filter((item) => fs.lstatSync(this.path(item)).isDirectory());
    if (items.length <= 0) {
      return;
    }
    Promise.all(
      items.map((item) => {
        return new Promise((reslove, reject) => {
          const webpackConfig = this.require(`${item}/webpack/build.js`);
          if (!webpackConfig.entry) {
            const { entry } = this.getEntry(item);
            if (entry) {
              webpackConfig.entry = entry;
            } else {
              reject(`${item} entry miss`);
              return;
            }
          }
          this.loading(`Start build ${item}`);
          webpackConfig.context = this.path(item);
          if (webpackConfig.output.filename !== '[name].js') {
            webpackConfig.output.filename = '[name].js';
            webpackConfig.output.path = this.path(`${item}/dist`);
          }
          const compiler = Webpack(webpackConfig);
          if (fs.existsSync(compiler.outputPath)) {
            fs.rmSync(compiler.outputPath, { recursive: true });
          }
          compiler.run((err, stats) => {
            if (err) {
              reject(err);
              this.stopLoading();
              return;
            }
            if (stats) {
              process.stdout.write(
                `${stats.toString({
                  colors: true,
                  modules: false,
                  children: false,
                  chunks: false,
                  chunkModules: false,
                })}\n\n`
              );
              if (stats.hasErrors()) {
                this.error('Build failed with errors.');
              }
            }
            compiler.close((closeErr) => {
              this.afterAll(item);
              reslove(item);
              closeErr && this.error(closeErr.message);
              this.stopLoading();
            });
          });
          process.on('SIGINT', () => {
            compiler.close(() => {
              this.stopLoading();
              process.exit();
            });
          });
        });
      })
    )
      .then((items) => {
        items.forEach((item) => {
          const filePath = this.path(`${item}/dist`);
          if (!fs.existsSync(filePath)) {
            console.log(`${item} dist miss`);
            return;
          }
          fs.cpSync(filePath, '/Users/ranhe/circle/ext/widget', {
            recursive: true,
          });
          fs.rmSync(filePath, { recursive: true });
        });
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        const node = process.cwd() + '/node_modules';
        if (fs.existsSync(node)) {
          fs.rmSync(node, { recursive: true });
        }
      });
  }
}
