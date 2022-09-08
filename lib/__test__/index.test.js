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
    jest.useRealTimers();
    for (const id in cluster.workers) {
      if (Object.prototype.hasOwnProperty.call(cluster.workers, id)) {
        cluster.workers[id].process.kill();
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

      cluster.once('exit', (worker) => {
        expect(ids.includes(worker.id)).toBeTruthy();
        done();
      });

      const maxConnections = process.env.HARAKIRI_WORKER_CONN_LIMIT * WORKER_COUNT;
      for (let i = 0; i < maxConnections + 1; i++) {
        http.get(url);
      }
    });
  });

  test('terminates workers after time', (done) => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2022-01-01T12:00:00'));

    waitForWorkers(() => {
      const ids = Object.keys(cluster.workers).map(Number);

      cluster.once('exit', (worker) => {
        expect(ids.includes(worker.id)).toBeTruthy();
        done();
      });

      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);

      const newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);
    });
  });
});
