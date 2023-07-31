import fs from 'fs';
import Webpack from 'webpack';
import chokidar from 'chokidar';
import http, { Server } from 'http';
import detect from 'detect-port-alt';
import { WebSocketServer } from 'ws';
import Meta from './meta.class.js';

export default class DevProject extends Meta {
  private wss: WebSocketServer | null;
  private serve: Server | null;
  private timer: any = null;
  private root: string;

  constructor(args: any) {
    super({ name: 'devProject', args });
    this.root = this.path('dist');
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root);
    }
    this.wss = null;
    this.serve = null;
  }

  process() {
    this.loading('Starting development services...');
    return detect(9000, '0.0.0.0')
      .then((port: number) => {
        this.wss = new WebSocketServer({
          port,
        });
        this.wss.on('connection', (ws) => {
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
        return Promise.resolve();
      })
      .then(() => {
        this.serve = http.createServer((req, res) => {
          const target = `${this.root}${req.url}`;
          if (!target.endsWith('.json')) {
            res.end('not found anything!', 'utf8');
            return;
          }
          const data = fs.readFileSync(target, 'utf8');
          res.end(data, 'utf8');
        });
        return detect(9001, '0.0.0.0');
      })
      .then((port: number) => {
        this.serve && this.serve.listen(port);
        this.info(
          `\nThe development service has been started and is currently running on http://localhost:${port}/`
        );
        return Promise.resolve(port);
      })
      .then((port: number) => {
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
              this.stopLoading();
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
            this.wss && this.wss.close();
            this.serve && this.serve.close();
            watching.close(() => {
              this.afterAll();
            });
            process.exit();
          });

          reslove(port);
        });
      })
      .catch((err: Error) => {
        this.wss && this.wss.close();
        this.serve && this.serve.close();
        this.afterAll();
        this.error(err.message);
        process.exit();
      });
  }
}
