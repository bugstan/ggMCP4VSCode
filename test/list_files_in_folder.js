const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse, getStandardApiPath } = require('./utils');

/**
 * 测试目录列表功能
 * @param {number} port 端口号
 * @param {string} path 要列出的目录路径
 */
async function testListFilesInFolder(port, path = "/") {
    console.log(`\n========== 测试目录列表功能 ==========`);
    console.log(`请求路径: ${path}`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("list_files_in_folder", { pathInProject: path });
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('list_files_in_folder');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath}`);
        console.log(`Method: POST`);
        console.log(`Headers: Content-Type: application/json, Accept: application/json`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        console.log('收到响应。');
        
        // 只显示原始数据和JSON格式化后的输出
        displayResponse(response);
        
        return response.parsedResponse;
    } catch (error) {
        console.error(`\n测试目录列表功能时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            
            // 获取路径参数
            const args = process.argv.slice(2);
            let path = "/";  // 默认路径
            
            // 查找路径参数
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--path=')) {
                    path = args[i].split('=')[1];
                    break;
                } else if ((args[i] === '--path' || args[i] === '-d') && i + 1 < args.length) {
                    path = args[i + 1];
                    break;
                }
            }
            
            await testListFilesInFolder(port, path);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testListFilesInFolder };
