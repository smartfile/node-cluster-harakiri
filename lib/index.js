const cluster = require('cluster');
const debug = require('debug')('cluster-harakiri');

const WORKER_CONN_LIMIT = parseInt(process.env.HARAKIRI_WORKER_CONN_LIMIT, 10);
const WORKER_TTL = parseInt(process.env.HARAKIRI_WORKER_TTL, 10);
const WORKER_CHECK_INTERVAL = parseInt(process.env.HARAKIRI_WORKER_CHECK_INTERVAL, 10) || 30000;

const workers = {};
let initialized = false;

const setupHarakiri = (options) => {
  const ttl = (options && options.ttl) || WORKER_TTL;
  const connectionLimit = (options && options.connectionLimit) || WORKER_CONN_LIMIT;
  const restartWorker = !(options && options.restartWorker === false);
  const checkInterval = (options && options.checkInterval) || WORKER_CHECK_INTERVAL;

  const terminateWorker = (id) => {
    cluster.workers[id].disconnect();
    delete workers[id];
    debug(workers);
    if (restartWorker) {
      cluster.fork();
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
        terminateWorker(id);
      } else if (connectionLimit && workers[id].connectionCount > connectionLimit) {
        debug(`Terminating worker ${id} due to connection limit`);
        terminateWorker(id);
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
        if (message.cmd === 'NODE_CLUSTER' && message.accepted) {
          workers[worker.id].connectionCount += 1;
        }
      });
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
