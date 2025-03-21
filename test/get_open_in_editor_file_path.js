const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse, getStandardApiPath, config } = require('./utils');

/**
 * 测试获取当前打开的文件路径
 * @param {number} port 端口号 
 */
async function testGetOpenInEditorFilePath(port) {
    console.log(`\n========== 测试获取当前打开的文件路径 ==========`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_open_in_editor_file_path");
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('get_open_in_editor_file_path');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath} (将自动尝试备用路径)`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示响应数据
        displayResponse(response);
        
        // 解析内容
        if (response.parsedResponse && response.parsedResponse.status) {
            const filePath = response.parsedResponse.status;
            console.log('\n当前打开的文件路径:', filePath);
            
            // 添加文件信息（如果有路径）
            if (filePath && filePath.trim() !== '') {
                console.log('\n文件信息:');
                const filePathInfo = {
                    absolutePath: filePath,
                    fileName: filePath.split(/[/\\]/).pop() || '',
                    extension: (filePath.split('.').pop() || '').toLowerCase()
                };
                
                console.log(`文件名: ${filePathInfo.fileName}`);
                console.log(`扩展名: ${filePathInfo.extension}`);
                console.log(`完整路径: ${filePathInfo.absolutePath}`);
            } else {
                console.log('\n没有打开的文件');
            }
            
            return filePath;
        } else if (response.parsedResponse && response.parsedResponse.error) {
            console.log(config.colors.red + `\n错误: ${response.parsedResponse.error}` + config.colors.reset);
            return null;
        } else {
            console.log(config.colors.red + '\n响应中没有有效的内容或格式不正确' + config.colors.reset);
            return null;
        }
    } catch (error) {
        console.error(config.colors.red + `\n测试获取当前打开文件路径时出错: ${error.message}` + config.colors.reset);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testGetOpenInEditorFilePath(port);
        } catch (error) {
            console.error(config.colors.red + `测试失败: ${error.message}` + config.colors.reset);
            process.exit(1);
        }
    })();
}

module.exports = { testGetOpenInEditorFilePath };
