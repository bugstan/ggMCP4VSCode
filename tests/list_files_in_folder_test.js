const http = require('http');

function testListFilesInFolder() {
    const url = 'http://localhost:9960/api/mcp/list_files_in_folder';
    const payload = {
        pathInProject: 'test'
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
testListFilesInFolder();