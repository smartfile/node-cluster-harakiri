const http = require('http');
const path = require('path');
const cluster = require('..');

const WORKER_COUNT = 4;

cluster.setupPrimary({
  exec: path.join(__dirname, 'stub.js'),
});

describe('Cluster Harakiri', () => {
  beforeEach(() => {
    for (let i = 0; i < WORKER_COUNT; i++) {
      cluster.fork();
    }
  });

  afterEach(() => {
    for (const id in cluster.workers) {
      if (Object.prototype.hasOwnProperty.call(cluster.workers, id)) {
        cluster.workers[id].disconnect();
      }
    }
  });

  const waitForWorkers = (test) => {
    let workersOnline = 0;
    cluster.on('online', () => {
      workersOnline += 1;
      if (workersOnline === WORKER_COUNT) {
        test();
      }
    });
  };

  test('terminates workers after limit', (done) => {
    waitForWorkers(() => {
      const url = `http://localhost:${process.env.TEST_PORT}`;
      const ids = Object.keys(cluster.workers).map(Number);

      cluster.on('exit', (worker) => {
        cluster.removeAllListeners('exit');
        expect(ids.includes(worker.id)).toBeTruthy();
        done();
      });

      const maxConnections = process.env.HARAKIRI_WORKER_CONN_LIMIT * WORKER_COUNT;
      for (let i = 0; i < maxConnections + 1; i++) {
        http.get(url);
      }
    });
  });
});
