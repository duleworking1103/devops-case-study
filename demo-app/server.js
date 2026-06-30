const http = require('http');

// Nhận các biến từ môi trường (được Inject từ K8s/Helm)
const deployEnv = process.env.APP_ENV || 'local';
const serviceName = process.env.SERVICE_NAME || 'Unknown Service';
const appVersion = process.env.APP_VERSION || 'v0.0.0';
const secretUrl = process.env.SECRET_API_URL || 'No Secret Provided';

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  
  // Trả về JSON để dễ quan sát
  const responseData = {
    message: "DevOps Case Study App is Running!",
    config: {
      Environment: deployEnv,
      service: serviceName,
      version: appVersion,
      // Trong thực tế không in secret ra màn hình, nhưng để demo chúng ta show một phần
      secret_api: secretUrl 
    }
  };
  
  res.end(JSON.stringify(responseData, null, 2));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[${serviceName}] Version ${appVersion} started on port ${PORT}`);
});
