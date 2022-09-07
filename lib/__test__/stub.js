const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Test');
}).listen(process.env.TEST_PORT);
