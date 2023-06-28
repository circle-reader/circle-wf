export const debug = process.env.DEBUG === 'TRUE';
export const name = process.env.npm_package_name || 'circle-cli';
export const version = process.env.npm_package_version || '1.0.0';
export const description = '快速开发 Circle 阅读助手应用的命令行工具';

export const registryApi = 'https://registry.npmmirror.com';
export const registry = 'https://registry.npm.taobao.org';
export const projects =
  'https://registry.npm.taobao.org/api/v4/groups/3257/projects';
export const repository =
  'https://registry.npm.taobao.org/api/v4/projects/_repo_/repository/archive.zip';
export const docs =
  'https://registry.npm.taobao.org/api/v4/projects/_repo_/repository/archive.zip';
