const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse, getStandardApiPath } = require('./utils');

/**
 * 测试根据名称子字符串查找文件
 * @param {number} port 端口号
 * @param {string} nameSubstring 要搜索的文件名子字符串
 */
async function testFindFilesByNameSubstring(port, nameSubstring) {
    console.log(`\n========== 测试根据名称子字符串查找文件 ==========`);
    console.log(`搜索子字符串: "${nameSubstring}"`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("find_files_by_name_substring", { nameSubstring });
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('find_files_by_name_substring');
        
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
        console.error(`\n测试根据名称子字符串查找文件时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            
            // 获取搜索子字符串参数
            const args = process.argv.slice(2);
            let searchStr = "handler"; // 默认搜索子字符串
            
            // 查找搜索参数
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--search=')) {
                    searchStr = args[i].split('=')[1];
                    break;
                } else if ((args[i] === '--search' || args[i] === '-s') && i + 1 < args.length) {
                    searchStr = args[i + 1];
                    break;
                }
            }
            
            await testFindFilesByNameSubstring(port, searchStr);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testFindFilesByNameSubstring };
