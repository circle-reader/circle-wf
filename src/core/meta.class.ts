import fs from 'fs';
import path from 'path';
import Task from './task.class.js';

export default class Meta extends Task {
  private getEntry() {
    let entry = '';
    [
      'index.ts',
      'index.class.ts',
      'index.tsx',
      'index.js',
      'index.class.js',
      'index.jsx',
    ].forEach((key) => {
      const entryPath = this.path(`src/${key}`);
      if (fs.existsSync(entryPath)) {
        entry = key;
      }
    });
    return entry;
  }

  private reactProject(entry: string) {
    return /\.(tsx|jsx)/.test(entry);
  }

  beforeAll() {
    const entry = this.getEntry();
    if (entry) {
      const autoEntry = this.path(
        `src/.circle/autoConfig/entry.${/\.ts/.test(entry) ? 'ts' : 'js'}`
      );

      if (!fs.existsSync(autoEntry)) {
        fs.mkdirSync(path.dirname(autoEntry), { recursive: true });
      }
      const data = this.reactProject(entry)
        ? [
            `// Dynamically generated entry file, please do not edit the file directly`,
            `import { App, Plugin } from 'circle-cts';`,
            `import children from '../../${entry.replace(
              /\.(tsx|jsx|ts|js)/,
              ''
            )}';`,
            ``,
            `//@ts-ignore`,
            `definePlugin('${this.pkg.name}', function (app: App, plugin: Plugin, { display }: any) {
              let destory: (() => void) | null = null;

              return {
                start() {
                  if (destory) {
                    return;
                  }
                  destory = display.render(app, children, {
                    me: plugin,
                    // @ts-ignore
                    style: window.inlineStyle,
                  });
                },
                destory() {
                  if (destory) {
                    destory();
                    destory = null;
                  }
                },
              };
            });`,
            ``,
          ]
        : [
            `// Dynamically generated entry file, please do not edit the file directly`,
            `import children from '../../${entry.replace(
              /\.(tsx|jsx|ts|js)/,
              ''
            )}';`,
            ``,
            `//@ts-ignore`,
            `definePlugin('${this.pkg.name}', children);`,
            ``,
          ];
      fs.writeFileSync(autoEntry, data.join('\n'));
    }
  }

  afterAll(port?: number) {
    const main = this.path('/dist/main.js');
    if (!fs.existsSync(main)) {
      return;
    }
    const debug = typeof port === 'number' && port !== 0;
    const appConfig: any = {
      id: this.pkg.name,
      type: this.pkg._type || 'plugin',
      version: this.pkg.version || '1.0.0',
    };
    if (debug) {
      appConfig.debug = true;
    }
    ['title', 'runAt', 'preset', 'priority', 'homepage', 'description'].forEach(
      (field) => {
        this.pkg[field] && (appConfig[field] = this.pkg[field]);
      }
    );
    if (this.pkg._dependencies) {
      appConfig.dependencies = this.pkg._dependencies;
    }
    const entry = this.getEntry();
    if (entry && this.reactProject(entry)) {
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
    if (this.pkg.author) {
      if (typeof this.pkg.author === 'string') {
        appConfig.author = this.pkg.author;
      } else if (typeof this.pkg.author === 'object') {
        const authorFields = [];
        if (this.pkg.author.name) {
          authorFields.push(this.pkg.author.name);
        }
        if (this.pkg.author.email) {
          authorFields.push(`<${this.pkg.author.email}>`);
        }
        if (this.pkg.author.url) {
          authorFields.push(`(${this.pkg.author.url})`);
        }
        appConfig.author = authorFields.join(' ');
      }
    }
    const option = this.path('option.json');
    if (fs.existsSync(option)) {
      const optionString = fs.readFileSync(option, 'utf8');
      if (optionString) {
        const optionData = JSON.parse(optionString);
        if (Array.isArray(optionData) && optionData.length > 0) {
          appConfig.option = {
            data: optionData,
          };
        } else if (Object.keys(optionData).length > 0) {
          appConfig.option = optionData;
        }
      }
    }
    const i18n = this.path('i18n');
    if (fs.existsSync(i18n)) {
      const i18ns = fs
        .readdirSync(i18n)
        .filter((file: string) => file.endsWith('.json'))
        .map((item) => {
          const i18nString = fs.readFileSync(`${i18n}/${item}`, 'utf8');
          if (i18nString) {
            const i18nData = JSON.parse(i18nString);
            if (Object.keys(i18nData).length > 0) {
              return {
                key: item.replace(/(\/|\.json)/g, ''),
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
    const mainFile = factory.replace('__PLUGIN_NAME__', this.pkg.name);
    const args = this.props.args || {};
    if (args.separate) {
      fs.writeFileSync(
        this.path(`/dist/${this.pkg.name}.json`),
        JSON.stringify(appConfig, null, 2)
      );
      fs.writeFileSync(this.path(`/dist/${this.pkg.name}.js`), mainFile);
    } else {
      appConfig.main = mainFile;
      fs.writeFileSync(
        this.path(`/dist/${this.pkg.name}.json`),
        JSON.stringify(appConfig, null, 2)
      );
    }
    fs.rmSync(main);
  }
}