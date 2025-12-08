const http = require('http');

function testReplaceSpecificText() {
    const url = 'http://localhost:9960/api/mcp/replace_specific_text';
    const payload = {
        pathInProject: 'test/replace_test.ts',
        oldText: '    constructor() {\n' +
          '        super(\n' +
          '            \'replace_specific_text\',\n' +
          '            \'Replaces specific text occurrences in a file with new text and automatically opens the file after replacement.\',\n' +
          '            {\n' +
          '                type: \'object\',\n' +
          '                properties: {\n' +
          '                    pathInProject: { type: \'string\' },\n' +
          '                    oldText: { type: \'string\' },\n' +
          '                    newText: { type: \'string\' },\n' +
          '                },\n' +
          '                required: [\'pathInProject\', \'oldText\', \'newText\'],\n' +
          '            }\n' +
          '        );\n' +
          '    }',
        newText: '    constructor() {\n' +
          '        super(\n' +
          '    }'
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

// 运行测试
testReplaceSpecificText();