import fs from 'fs';
import path from 'path';
import Task from './task.class.js';

export default class Meta extends Task {
  private _getEntry() {
    let index = '';
    [
      'index.tsx',
      'index.jsx',
      'index.ts',
      'index.class.ts',
      'index.class.js',
      'index.js',
    ].forEach((key) => {
      const entryPath = this.path(`src/${key}`);
      if (fs.existsSync(entryPath)) {
        index = key;
      }
    });
    return index;
  }

  private reactProject(entry: string) {
    return /\.(tsx|jsx)/.test(entry);
  }

  getEntry() {
    const index = this._getEntry();
    if (index) {
      return {
        index,
        entry: this.path(
          `src/.circle/autoConfig/entry.${index.split('.').pop()}`
        ),
      };
    }
    return { index: '', entry: '' };
  }

  beforeAll() {
    const { index, entry } = this.getEntry();
    if (!index) {
      return;
    }
    if (!fs.existsSync(entry)) {
      fs.mkdirSync(path.dirname(entry), { recursive: true });
    }
    const projectConfig: {
      [index: string]: string | boolean | number;
    } = {};
    const projectConfigPath = this.path('config.json');
    if (fs.existsSync(projectConfigPath)) {
      const projectConfigFile = fs.readFileSync(projectConfigPath, 'utf8');
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
    const data =
      this.pkg.name !== 'display' && this.reactProject(index)
        ? [
            `// Dynamically generated entry file, please do not edit the file directly`,
            `//@ts-ignore`,
            `import React from 'react';`,
            `import { App, Plugin, AppContext } from 'circle-ihk';`,
            `import Entry from '../../${index.replace(/\.(tsx|jsx)/, '')}';`,
            ``,
            `//@ts-ignore`,
            `window.definePlugin('${
              this.pkg.name
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
            `window.definePlugin('${this.pkg.name}', children);`,
            ``,
          ];
    fs.writeFileSync(entry, data.join('\n'));
  }

  afterAll() {
    const main = this.path('/dist/main.js');
    if (!fs.existsSync(main)) {
      return;
    }
    const appConfig: any = {
      id: this.pkg.name,
      type: this.pkg._type || 'plugin',
      version: this.pkg.version || '1.0.0',
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
      this.pkg[field] && (appConfig[field] = this.pkg[field]);
    });
    if (this.pkg._dependencies) {
      appConfig.dependencies = this.pkg._dependencies;
    }
    const index = this._getEntry();
    if (this.pkg.name !== 'display' && index && this.reactProject(index)) {
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
    const settings = this.path('settings.json');
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
