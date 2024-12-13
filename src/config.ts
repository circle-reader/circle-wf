export const MAP: {
  [index: string]: {
    app: string;
    data: string;
    target?: string;
  };
} = {
  exvul: {
    app: 'https://exvul.com/exvul_2024_08_29_pull.php',
    data: 'root@8.217.159.162:/var/htdocs',
    target: '/Users/ranhe/app/circle-website/app',
  },
  exvul_admin: {
    app: 'https://whatsmyadmin.exvul.com/deploy`',
    data: 'ubuntu@43.155.24.62:/home/ubuntu/app',
  },
  exvul_admin_test: {
    app: 'https://whatsmyadmin-test.exvul.com/deploy`',
    data: 'ubuntu@124.156.135.240:/home/ubuntu/app',
  },
  nda: {
    app: 'https://rtq.world/deploy`',
    data: 'ec2-user@35.172.26.191:/home/ec2-user/app',
  },
  nda_test: {
    app: 'https://test.rtq.world/deploy`',
    data: 'ec2-user@35.172.26.191:/home/ec2-user/app-test',
  },
};
