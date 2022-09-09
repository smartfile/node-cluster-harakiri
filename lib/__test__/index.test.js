const path = require('path');
const axios = require('axios');

const WORKER_COUNT = 4;

const waitForWorkerStart = (_cluster, test) => {
  let workersOnline = 0;
  _cluster.on('online', () => {
    workersOnline += 1;
    if (workersOnline === WORKER_COUNT) {
      test();
    }
  });
};

const waitForWorkerEnd = (_cluster, ids, done) => {
  _cluster.on('exit', (worker) => {
    expect(ids.includes(worker.id)).toBeTruthy();
    /* eslint-disable-next-line no-param-reassign */
    ids = ids.filter((id) => id !== worker.id);
    if (ids.length === 0) {
      _cluster.removeAllListeners('exit');
      done();
    }
  });
};

let cluster;

beforeEach(() => {
  jest.resetModules();
  /* eslint-disable-next-line global-require */
  cluster = require('..');
  cluster.setupPrimary({
    exec: path.join(__dirname, 'stub.js'),
  });

  jest
    .useFakeTimers()
    .setSystemTime(new Date('2022-01-01T12:00:00'));
});

afterEach(() => {
  jest.useRealTimers();

  for (const id in cluster.workers) {
    if (Object.prototype.hasOwnProperty.call(cluster.workers, id)) {
      cluster.workers[id].process.kill();
    }
  }
});

describe('Cluster Harakiri (env)', () => {
  beforeEach(() => {
    cluster.setupHarakiri({ restartWorker: false });
    for (let i = 0; i < WORKER_COUNT; i++) {
      cluster.fork();
    }
  });

  test('terminates workers after limit', (done) => {
    let complete = false;

    waitForWorkerStart(cluster, async () => {
      const url = `http://localhost:${process.env.TEST_PORT}`;
      const ids = Object.keys(cluster.workers).map(Number);

      waitForWorkerEnd(cluster, ids, () => {
        expect(complete).toBeTruthy();
        done();
      });

      const maxConnections = process.env.HARAKIRI_WORKER_CONN_LIMIT * WORKER_COUNT;
      for (let i = 0; i < maxConnections + WORKER_COUNT; i++) {
        /* eslint-disable-next-line no-await-in-loop */
        await axios.get(url);
      }

      complete = true;
    });
  });

  test('terminates workers after time', (done) => {
    let complete = false;

    waitForWorkerStart(cluster, () => {
      const ids = Object.keys(cluster.workers).map(Number);

      waitForWorkerEnd(cluster, ids, () => {
        expect(complete).toBeTruthy();
        done();
      });

      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);

      const newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      complete = true;
      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);
    });
  });
});

describe('Cluster Harakiri (conf)', () => {
  const ttl = 60000;
  const connectionLimit = 1;

  beforeEach(() => {
    cluster.setupHarakiri({ ttl, connectionLimit, restartWorker: false });
    for (let i = 0; i < WORKER_COUNT; i++) {
      cluster.fork();
    }
  });

  test('terminates workers after limit', (done) => {
    let complete = false;

    waitForWorkerStart(cluster, async () => {
      const url = `http://localhost:${process.env.TEST_PORT}`;
      const ids = Object.keys(cluster.workers).map(Number);

      waitForWorkerEnd(cluster, ids, () => {
        expect(complete).toBeTruthy();
        done();
      });

      const maxConnections = connectionLimit * WORKER_COUNT;
      for (let i = 0; i < maxConnections + WORKER_COUNT; i++) {
        /* eslint-disable-next-line no-await-in-loop */
        await axios.get(url);
      }

      complete = true;
    });
  });

  test('terminates workers after time', (done) => {
    let complete = false;

    waitForWorkerStart(cluster, () => {
      const ids = Object.keys(cluster.workers).map(Number);

      waitForWorkerEnd(cluster, ids, () => {
        expect(complete).toBeTruthy();
        done();
      });

      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);

      let newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersByTime(process.env.HARAKIRI_WORKER_TTL / 2);

      newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      complete = true;
      jest.setSystemTime(new Date('2022-01-01T12:01:00'));
      jest.advanceTimersByTime(ttl);
    });
  });
});
