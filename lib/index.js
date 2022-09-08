const cluster = require('cluster');
const debug = require('debug')('cluster-harakiri');

const WORKER_CONN_LIMIT = parseInt(process.env.HARAKIRI_WORKER_CONN_LIMIT, 10);
const WORKER_TTL = parseInt(process.env.HARAKIRI_WORKER_TTL, 10);

const workers = {};
let initialized = false;

const setupHarakiri = (options) => {
  const ttl = (options && options.ttl) || WORKER_TTL;
  const connectionLimit = (options && options.connectionLimit) || WORKER_CONN_LIMIT;
  const restartWorker = !(options && options.restartWorker === false);

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
  if (ttl) {
    setInterval(() => {
      for (const id in workers) {
        if ((Date.now() - workers[id].startTime) > ttl) {
          debug(`Terminating worker ${id} due to age`);
          terminateWorker(id);
        }
      }
    }, ttl / 10);
  }

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
          if (workers[worker.id].connectionCount > connectionLimit) {
            debug(`Terminating worker ${worker.id} due to connection limit`);
            terminateWorker(worker.id);
          }
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
