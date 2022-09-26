const cluster = require('cluster');
const debug = require('debug')('cluster-harakiri');

const WORKER_CONN_LIMIT = parseInt(process.env.HARAKIRI_WORKER_CONN_LIMIT, 10);
const WORKER_TTL = parseInt(process.env.HARAKIRI_WORKER_TTL, 10);
const WORKER_CHECK_INTERVAL = parseInt(process.env.HARAKIRI_WORKER_CHECK_INTERVAL, 10) || 30;
const WORKER_TERM_DELAY = parseInt(process.env.HARAKIRI_WORKER_TERM_DELAY, 10);
const WORKER_CLOSE_TIMEOUT = parseInt(process.env.HARAKIRI_WORKER_CLOSE_TIMEOUT, 10);

const workers = {};
const terminatingWorkers = [];
const closingWorkers = {};
let lastTermination = Date.now();
let initialized = false;

const setupHarakiri = (options) => {
  const ttl = ((options && options.ttl) || WORKER_TTL) * 1000;
  const connectionLimit = (options && options.connectionLimit) || WORKER_CONN_LIMIT;
  const restartWorker = !(options && options.restartWorker === false);
  const checkInterval = ((options && options.checkInterval) || WORKER_CHECK_INTERVAL) * 1000;
  const termDelay = ((options && options.termDelay) || WORKER_TERM_DELAY) * 1000;
  const closeTimeout = ((options && options.closeTimeout) || WORKER_CLOSE_TIMEOUT) * 1000;

  const terminateWorker = (id) => {
    lastTermination = Date.now();
    if (closeTimeout) {
      closingWorkers[id] = {
        terminationTime: Date.now(),
        worker: cluster.workers[id],
      };
    }
    cluster.workers[id].disconnect();
    if (restartWorker) {
      cluster.fork();
    }
  };

  const queueTermination = (id) => {
    delete workers[id];
    debug(workers);
    if (termDelay) {
      terminatingWorkers.push(id);
    } else {
      terminateWorker(id);
    }
  };

  if (initialized) {
    return;
  }

  initialized = true;

  const interval = (ttl) ? Math.min(ttl, checkInterval) : checkInterval;
  setInterval(() => {
    debug(workers);
    for (const id in workers) {
      if (ttl && (Date.now() - workers[id].startTime) > ttl) {
        debug(`Terminating worker ${id} due to age`);
        queueTermination(id);
      } else if (connectionLimit && workers[id].connectionCount > connectionLimit) {
        debug(`Terminating worker ${id} due to connection limit`);
        queueTermination(id);
      }
    }
    if (termDelay && terminatingWorkers.length > 0) {
      if (Date.now() - lastTermination > termDelay) {
        terminateWorker(terminatingWorkers.shift());
      }
    }
    if (closeTimeout) {
      for (const id in closingWorkers) {
        if (Date.now() - closingWorkers[id].terminationTime > closeTimeout) {
          debug(`Force killing worker ${id}`);
          closingWorkers[id].worker.kill();
        }
      }
    }
  }, interval);

  cluster.on('online', (worker) => {
    workers[worker.id] = {
      startTime: Date.now(),
      connectionCount: 0,
    };
    debug(workers);

    if (connectionLimit) {
      worker.process.on('internalMessage', (message) => {
        if (message.cmd === 'NODE_CLUSTER' && message.accepted && worker.id in workers) {
          workers[worker.id].connectionCount += 1;
        }
      });
    }
  });

  cluster.on('exit', (worker) => {
    if (!worker.exitedAfterDisconnect) {
      // Something unexpected happened. A new worker needs to be created.
      cluster.fork();
    }

    if (terminatingWorkers.includes(worker.id)) {
      terminatingWorkers.splice(terminatingWorkers.indexOf(worker.id), 1);
    }
    if (worker.id in workers) {
      delete workers[worker.id];
    }
    if (worker.id in closingWorkers) {
      delete closingWorkers[worker.id];
    }
  });
};

const clusterFork = cluster.fork;
cluster.fork = (env) => {
  setupHarakiri();
  return clusterFork(env);
};
cluster.setupHarakiri = setupHarakiri;

module.exports = cluster;
