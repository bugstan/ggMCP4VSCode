const http = require('http');

function testGetFileTextByPath() {
    const url = 'http://localhost:9960/api/mcp/get_file_text_by_path';
    const payload = {
        pathInProject: 'test/new_test_file.txt'
    };

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(url, options, (res) => {
        let data = '';

        console.log('Request URL:', url);
        console.log('Request Headers:', options.headers);
        console.log('Request Payload:', payload);
        console.log('Response Status Code:', res.statusCode);

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('Response Content:', data);
        });
    });

    req.on('error', (error) => {
        console.error('Request Error:', error);
    });

    req.write(JSON.stringify(payload));
    req.end();
}

// Run test
testGetFileTextByPath();