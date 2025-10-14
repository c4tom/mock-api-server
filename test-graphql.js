// Simple GraphQL test script
const http = require('http');

function testGraphQL() {
    const data = JSON.stringify({
        query: '{ hello }'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/graphql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', body);
            try {
                const json = JSON.parse(body);
                if (json.data && json.data.hello) {
                    console.log('\n✅ GraphQL is working!');
                    console.log('Hello message:', json.data.hello);
                } else if (json.error) {
                    console.log('\n❌ Error:', json.error.message);
                }
            } catch (e) {
                console.log('\n❌ Failed to parse response');
            }
            process.exit(0);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request failed:', error.message);
        process.exit(1);
    });

    req.write(data);
    req.end();
}

// Wait a bit for server to start
setTimeout(testGraphQL, 2000);
