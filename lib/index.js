const cluster = require('cluster');
const debug = require('debug')('cluster-harakiri');

const WORKER_CONN_LIMIT = parseInt(process.env.HARAKIRI_WORKER_CONN_LIMIT, 10);
const WORKER_TTL = parseInt(process.env.HARAKIRI_WORKER_TTL, 10);

const workers = {};

const terminateWorker = (id) => {
  cluster.workers[id].disconnect();
  delete workers[id];
  debug(workers);
  cluster.fork();
};

if (WORKER_TTL) {
  setInterval(() => {
    for (const id in workers) {
      if ((Date.now() - workers[id].startTime) > WORKER_TTL) {
        debug(`Terminating worker ${id} due to age`);
        terminateWorker(id);
      }
    }
  }, WORKER_TTL / 10);
}

cluster.on('online', (worker) => {
  workers[worker.id] = {
    startTime: Date.now(),
    connectionCount: 0,
  };
  debug(workers);

  if (WORKER_CONN_LIMIT) {
    worker.process.on('internalMessage', (message) => {
      if (message.cmd === 'NODE_CLUSTER' && message.accepted) {
        workers[worker.id].connectionCount += 1;
        if (workers[worker.id].connectionCount > WORKER_CONN_LIMIT) {
          debug(`Terminating worker ${worker.id} due to connection limit`);
          terminateWorker(worker.id);
        }
      }
    });
  }
});

module.exports = cluster;
