export const MAP: {
  [index: string]: {
    app: string;
    data: string;
    target?: string;
  };
} = {
  test1: {
    app: 'https://xxx/xx',
    data: 'root@xxx:/var/test',
    target: '/Users/xx/app/xxx',
  },
  test2: {
    app: 'https://xxx/xxx`',
    data: 'root@xxx:/var/test',
  },
};
