const { findMCPServerPort, makeRequest, displayResponse, getStandardApiPath, config } = require('./utils');

/**
 * 测试获取可用工具列表
 * @param {number} port 端口号
 */
async function testListTools(port) {
    console.log(`\n========== 测试获取可用工具列表 ==========`);
    
    try {
        // 获取标准API路径
        const apiPath = getStandardApiPath('list_tools');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath} (将自动尝试备用路径)`);
        console.log(`Method: GET`);
        console.log(`Headers: Accept: application/json`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, apiPath, 'GET');
        console.log('收到响应。');
        
        // 只显示原始数据和JSON格式化后的输出
        displayResponse(response);
        
        return response.parsedResponse;
    } catch (error) {
        console.error(config.colors.red + `\n测试获取工具列表时出错: ${error.message}` + config.colors.reset);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testListTools(port);
        } catch (error) {
            console.error(config.colors.red + `测试失败: ${error.message}` + config.colors.reset);
            process.exit(1);
        }
    })();
}

module.exports = { testListTools };
