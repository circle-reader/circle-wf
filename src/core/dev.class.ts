import fs from 'fs';
import Webpack from 'webpack';
import chokidar from 'chokidar';
import http, { Server } from 'http';
import { WebSocketServer } from 'ws';
import { choosePort } from 'react-dev-utils/WebpackDevServerUtils.js';
import Meta from './meta.class.js';

export default class DevProject extends Meta {
  private serve: Server | null;
  private timer: any = null;
  private root: string;

  constructor(args: any) {
    super({ name: 'devProject', args });
    this.root = this.path('dist');
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root);
    }
    this.serve = null;
    choosePort('0.0.0.0', 9100).then((port) => {
      if (typeof port !== 'number') {
        process.exit();
      }
      const wss = new WebSocketServer({
        port,
      });
      wss.on('connection', (ws) => {
        const watcher = chokidar.watch(this.root, {
          ignoreInitial: true,
        });
        watcher.on('all', () => {
          this.timer && clearTimeout(this.timer);
          this.timer = setTimeout(function () {
            ws.send('reload');
          });
        });
        ws.on('close', () => {
          watcher.close();
        });
      });
      process.on('SIGINT', () => {
        wss.close();
      });
    });
  }

  private devServer() {
    this.serve = http.createServer((req, res) => {
      const target = `${this.root}${req.url}`;
      if (!target.endsWith('.json')) {
        res.end('not found anything!', 'utf8');
        return;
      }
      const data = fs.readFileSync(target, 'utf8');
      res.end(data, 'utf8');
    });

    return choosePort('0.0.0.0', 9000);
  }

  process() {
    this.loading('Starting development services...');
    return this.devServer()
      .then((port) => {
        if (typeof port !== 'number') {
          this.afterAll();
          process.exit();
        }
        this.serve && this.serve.listen(port);
        this.stopLoading();
        this.info(
          `The development service has been started and is currently running on http://localhost:${port}/`
        );
        return Promise.resolve(port);
      })
      .then((port) => {
        return new Promise((reslove) => {
          const webpackConfig = this.require('webpack/dev.js');
          if (!webpackConfig.entry) {
            const { entry } = this.getEntry();
            if (entry) {
              webpackConfig.entry = entry;
            }
          }

          const compiler = Webpack(webpackConfig);
          // `compiler.outputPath` is safe, even if user webpack config `output.path` is not set.
          if (fs.existsSync(compiler.outputPath)) {
            fs.rmSync(compiler.outputPath, { recursive: true });
          }

          const watching = compiler.watch(
            {
              aggregateTimeout: 300,
            },
            (err, stats) => {
              if (err) {
                this.error(err.message);
                this.afterAll(port);
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
                  console.error('Build failed with errors.');
                }
              }
              this.afterAll(port);
            }
          );

          process.on('SIGINT', () => {
            if (this.serve) {
              this.serve.close();
              this.serve = null;
            }
            watching.close(() => {
              this.afterAll();
              process.exit();
            });
          });

          reslove(port);
        });
      });
  }
}
