import axios from 'axios';
import shell from 'shelljs';
import inquirer from 'inquirer';
import { consola } from 'consola';
import pkg from '../package.json';
import { registry } from './config';

// 如果shell出错则结束
shell.config.fatal = true;

const shouldCheck = () => {
  if (process.env.DEBUG === 'true') {
    return true;
  }
  // a simple gray update check
  return Math.random() < 0.2;
};

export default async function checkVersion() {
  if (!shouldCheck()) {
    return;
  }
  consola.log('[check latest version]...');
  consola.log(`[current version]: ${pkg.version}`);
  try {
    const repo = await axios.get(
      `${registry}/${encodeURIComponent(pkg.name)}`,
      { timeout: 3000 }
    );
    const latestVersion =
      repo.data['dist-tags'] && repo.data['dist-tags'].latest
        ? repo.data['dist-tags'].latest
        : false;
    if (latestVersion && latestVersion === pkg.version) {
      consola.success('✔ current version is up-to-date');
      return;
    }
    const { update } = await inquirer.prompt([
      {
        name: 'update',
        type: 'confirm',
        message: `The latest version is "${latestVersion}" which may support new feature(s) or bugfix(es). \nWould you want to upgrade it?`,
      },
    ]);
    if (!update) {
      return;
    }
    consola.log('[updating version]...');
    const updateCMD = `yarn global add ${pkg.name}`;
    consola.log(updateCMD);
    shell.exec(updateCMD);
    consola.success('✔ Upgrade is completed. Please run the cmd again.');
    shell.exit(0);
  } catch (e) {
    consola.warn('check remote version failed, skipped.');
    consola.error(e);
  }
}
