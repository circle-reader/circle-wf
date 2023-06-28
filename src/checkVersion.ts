import axios from 'axios';
import shell from 'shelljs';
import inquirer from 'inquirer';
import { consola } from 'consola';
import { name, debug, registry, version } from './config.js';

// 如果shell出错则结束
shell.config.fatal = true;

const shouldCheck = () => {
  if (debug) {
    return false;
  }
  // a simple gray update check
  return Math.random() < 0.2;
};

export default async function checkVersion() {
  if (!shouldCheck()) {
    return;
  }
  consola.log(`当前版本: ${version} 更新检测中...`);
  try {
    const repo = await axios.get(`${registry}/${encodeURIComponent(name)}`, {
      timeout: 3000,
    });
    const latestVersion =
      repo.data['dist-tags'] && repo.data['dist-tags'].latest
        ? repo.data['dist-tags'].latest
        : false;
    if (latestVersion && latestVersion === version) {
      consola.success('当前已是最新版本');
      return;
    }
    const { update } = await inquirer.prompt([
      {
        name: 'update',
        type: 'confirm',
        message: '有新版本发布，是否立即更新？',
      },
    ]);
    if (!update) {
      return;
    }
    consola.log('更新版本中...');
    const updateCMD = `yarn global add ${name}`;
    shell.exec(updateCMD);
    consola.success('更新已完成，请再次执行操作');
    shell.exit(0);
  } catch (e) {
    consola.error(e);
  }
}
