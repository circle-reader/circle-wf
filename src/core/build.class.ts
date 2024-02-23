import fs from 'fs';
import Webpack from 'webpack';
import Meta from './meta.class.js';

export default class BuildProject extends Meta {
  constructor(args: any) {
    super({ args, name: 'buildProject' });
  }

  process() {
    this.loading('Start building...');
    return new Promise((reslove, reject) => {
      const webpackConfig = this.require('webpack/build.js');
      if (!webpackConfig.entry) {
        const { entry } = this.getEntry();
        if (entry) {
          webpackConfig.entry = entry;
        }
      }
      const compiler = Webpack(webpackConfig);
      if (fs.existsSync(compiler.outputPath)) {
        fs.rmSync(compiler.outputPath, { recursive: true });
      }

      compiler.run((err, stats) => {
        if (err) {
          reject(err);
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
          reslove(false);
          closeErr && this.error(closeErr.message);
        });
      });

      process.on('SIGINT', () => {
        compiler.close(() => {
          this.afterAll();
          process.exit();
        });
      });
    });
  }
}
