const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse, getStandardApiPath } = require('./utils');

/**
 * 测试通过路径获取文件内容
 * @param {number} port 端口号
 * @param {string} pathInProject 文件在项目中的路径
 */
async function testGetFileTextByPath(port, pathInProject = '/package.json') {
    console.log(`\n========== 测试通过路径获取文件内容 ==========`);
    console.log(`请求文件路径: ${pathInProject}`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_file_text_by_path", { pathInProject });
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('get_file_text_by_path');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath}`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        console.log('收到响应。');
        
        // 只显示原始数据和JSON格式化后的输出
        displayResponse(response);
        
        return response.parsedResponse;
    } catch (error) {
        console.error(`\n测试通过路径获取文件内容时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            
            // 获取文件路径参数
            const args = process.argv.slice(2);
            let filePath = '/package.json';  // 默认文件路径
            
            // 查找路径参数
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--path=')) {
                    filePath = args[i].split('=')[1];
                    break;
                } else if ((args[i] === '--path' || args[i] === '-f') && i + 1 < args.length) {
                    filePath = args[i + 1];
                    break;
                }
            }
            
            await testGetFileTextByPath(port, filePath);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetFileTextByPath };
