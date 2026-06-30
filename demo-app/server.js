const http = require('http');

// Nhận cấu hình từ môi trường
const deployEnv = process.env.APP_ENV || 'local';
const serviceName = process.env.SERVICE_NAME || 'Unknown Service';
const appVersion = process.env.APP_VERSION || 'v0.0.0';
const secretUrl = process.env.SECRET_API_URL || 'No Secret Provided';

// Biến giả lập lỗi cho mục đích Demo Rollback
// Nếu đặt APP_MODE=broken, app sẽ trả về lỗi 500
const appMode = process.env.APP_MODE || 'healthy';

const server = http.createServer((req, res) => {
    // READINESS/LIVENESS CHECK: Endpoint cho K8s kiểm tra sức khỏe
    if (req.url === '/health') {
        if (appMode === 'broken') {
            res.statusCode = 500;
            return res.end('Internal Server Error - Mock Failure');
        }
        res.statusCode = 200;
        return res.end('OK');
    }

    // MAIN APP ENDPOINT
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    
    const responseData = {
        message: "DevOps Case Study App is Running!",
        config: {
            Environment: deployEnv,
            service: serviceName,
            version: appVersion,
            // Ẩn bớt secret để đảm bảo an toàn
            secret_api: secretUrl.substring(0, 5) + "****" 
        }
    };
    
    res.end(JSON.stringify(responseData, null, 2));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`[${serviceName}] Version ${appVersion} started on port ${PORT}`);
    console.log(`Mode: ${appMode}`);
});
