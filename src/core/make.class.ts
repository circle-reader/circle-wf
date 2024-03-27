import fs from 'fs';
import path from 'path';
import Webpack from 'webpack';
import { nextTick } from 'process';
import Base from './base.class.js';

export default class MakeProject extends Base {
  private stop: boolean;

  constructor(args: any) {
    super({
      args,
      name: 'makeProject',
    });
    this.stop = false;
    process.on('SIGINT', () => {
      this.stop = true;
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
      'access',
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
    let mainFile = factory.replace('__PLUGIN_NAME__', pkg.name);
    // if (!['marked'].includes(pkg.name)) {
    //   mainFile = mainFile.replace(/\\n+/g, ' ');
    // }
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
    const install = () => {
      if (this.stop) {
        return;
      }
      const item = items.pop();
      if (item) {
        const webpackConfig = this.require(`${item}/webpack/build.js`);
        if (!webpackConfig) {
          this.error(`${item} config not found`);
          nextTick(install);
          return;
        }
        if (!webpackConfig.entry) {
          const { index, entry } = this.getEntry(item);
          if (!index) {
            console.log(`${item} index file not found`);
            return;
          }
          if (fs.existsSync(entry)) {
            webpackConfig.entry = entry;
          } else {
            fs.mkdirSync(path.dirname(entry), { recursive: true });
            const projectConfig: {
              [index: string]: string | boolean | number;
            } = {};
            const projectConfigPath = this.path(`${item}/config.json`);
            if (fs.existsSync(projectConfigPath)) {
              const projectConfigFile = fs.readFileSync(
                projectConfigPath,
                'utf8'
              );
              if (projectConfigFile) {
                const projectConfigData = JSON.parse(projectConfigFile);
                [
                  'mode',
                  'style',
                  'zIndex',
                  'useBody',
                  'useShadow',
                  'className',
                  'rootClassName',
                  'syncWithRender',
                ].forEach((key) => {
                  if (typeof projectConfigData[key] !== 'undefined') {
                    projectConfig[key] = projectConfigData[key];
                  }
                });
              }
            }
            const pkg = this.require(`${item}/package.json`);
            const data =
              pkg.name !== 'display' && this.reactProject(index)
                ? [
                    `// Dynamically generated entry file, please do not edit the file directly`,
                    `//@ts-ignore`,
                    `import React from 'react';`,
                    `import { App, Plugin, AppContext } from 'circle-ihk';`,
                    `import Entry from '../../${index.replace(
                      /\.(tsx|jsx)/,
                      ''
                    )}';`,
                    ``,
                    `//@ts-ignore`,
                    `window.definePlugin('${
                      pkg.name
                    }', function (plugin: Plugin, app: App, dependencies: {
              [index: string]: any;
            }) {
              let destory: (() => void) | null = null;

              return {
                start() {
                  if (destory) {
                    return;
                  }
                  destory = dependencies.display.render(({
                    root,
                    shadow,
                    container,
                  }: {
                    root: HTMLElement;
                    shadow: ShadowRoot;
                    container: HTMLElement;
                  }) => {
                    return {
                      app,
                      me: plugin,
                      children: <Entry />,
                      provider: (
                        <AppContext.Provider
                          value={{ app, root, shadow, container, me: plugin, dependencies }}
                        />
                      ),
                    };
                  },
                  {
                    // @ts-ignore
                    style: window.inlineStyle,
                    ...${JSON.stringify(projectConfig)}
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
                    `import children from '../../${index.replace(
                      /\.(tsx|jsx|ts|js)/,
                      ''
                    )}';`,
                    ``,
                    `//@ts-ignore`,
                    `window.definePlugin('${pkg.name}', children);`,
                    ``,
                  ];
            fs.writeFileSync(entry, data.join('\n'));
            webpackConfig.entry = entry;
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
            this.error(err.message);
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
            closeErr && this.error(closeErr.message);
            this.afterAll(item);
            this.stopLoading();
            const filePath = this.path(`${item}/dist`);
            if (!fs.existsSync(filePath)) {
              this.error(`${item} dist miss`);
              return;
            }
            fs.cpSync(filePath, '/Users/ranhe/circle/ext/widget', {
              recursive: true,
            });
            fs.rmSync(filePath, { recursive: true });
            nextTick(install);
          });
        });
      } else {
        const node = process.cwd() + '/node_modules';
        if (fs.existsSync(node)) {
          fs.rmSync(node, { recursive: true });
        }
        this.success("All the work has been done, it's up to you!");
      }
    };
    install();
  }
}
