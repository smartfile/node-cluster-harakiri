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
  jest
    .useFakeTimers()
    .setSystemTime(new Date('2022-01-01T12:00:00'));

  jest.resetModules();
  /* eslint-disable-next-line global-require */
  cluster = require('..');
  cluster.setupPrimary({
    exec: path.join(__dirname, 'stub.js'),
  });
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
      for (let i = 0; i < maxConnections + (2 * WORKER_COUNT); i++) {
        /* eslint-disable-next-line no-await-in-loop */
        await axios.get(url);
      }
      jest.advanceTimersToNextTimer();

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

      jest.setSystemTime(new Date('2022-01-01T12:00:10'));
      jest.advanceTimersToNextTimer();

      const newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      complete = true;
      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersToNextTimer();
    });
  });
});

describe('Cluster Harakiri (conf)', () => {
  const ttl = 60000;
  const checkInterval = 20000;
  const connectionLimit = 1;

  beforeEach(() => {
    cluster.setupHarakiri({
      ttl,
      checkInterval,
      connectionLimit,
      restartWorker: false,
    });
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
      for (let i = 0; i < maxConnections + (2 * WORKER_COUNT); i++) {
        /* eslint-disable-next-line no-await-in-loop */
        await axios.get(url);
      }
      jest.advanceTimersToNextTimer();

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

      jest.setSystemTime(new Date('2022-01-01T12:00:20'));
      jest.advanceTimersToNextTimer();

      let newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      jest.setSystemTime(new Date('2022-01-01T12:00:40'));
      jest.advanceTimersToNextTimer();

      newIds = Object.keys(cluster.workers).map(Number);
      expect(ids.every((element, index) => element === newIds[index]));

      complete = true;
      jest.setSystemTime(new Date('2022-01-01T12:01:00'));
      jest.advanceTimersToNextTimer();
    });
  });
});

describe('Cluster Harakiri (delay)', () => {
  const termDelay = 5000;

  beforeEach(() => {
    cluster.setupHarakiri({
      termDelay,
      restartWorker: false,
    });
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
      for (let i = 0; i < maxConnections + (2 * WORKER_COUNT); i++) {
        /* eslint-disable-next-line no-await-in-loop */
        await axios.get(url);
      }

      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:10'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:20'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:40'));
      jest.advanceTimersToNextTimer();

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

      jest.setSystemTime(new Date('2022-01-01T12:00:30'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:40'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:00:50'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:01:00'));
      jest.advanceTimersToNextTimer();

      jest.setSystemTime(new Date('2022-01-01T12:01:10'));
      jest.advanceTimersToNextTimer();

      complete = true;
    });
  });
});
