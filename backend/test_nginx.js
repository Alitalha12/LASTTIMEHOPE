const http = require('http');

const data = JSON.stringify({
  userInput: "I need a plumber in Islamabad F-10 at 2 PM",
  userId: "nginx_test_user"
});

const options = {
  hostname: 'localhost',
  port: 8888,
  path: '/api/service/request',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`Nginx Proxy Status: ${res.statusCode}`);
  let responseData = '';

  res.on('data', d => {
    responseData += d;
  });

  res.on('end', () => {
    console.log('Nginx Proxy Response:');
    console.log(responseData);
  });
});

req.on('error', error => {
  console.error('Error connecting to Nginx:', error);
});

req.write(data);
req.end();
