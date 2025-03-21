const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse } = require('./utils');

/**
 * 测试获取当前文件内容
 * @param {number} port 端口号
 */
async function testGetOpenInEditorFileText(port) {
    console.log(`\n========== 测试获取当前打开的文件内容 ==========`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_open_in_editor_file_text");
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/mcp/get_open_in_editor_file_text`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/mcp/get_open_in_editor_file_text', 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示响应数据
        displayResponse(response);
        
        // 解析内容
        if (response.parsedResponse && response.parsedResponse.status !== null) {
            const fileContent = response.parsedResponse.status;
            console.log('\n当前打开的文件内容分析:');
            
            if (typeof fileContent === 'string') {
                // 文件内容统计
                const lines = fileContent.split('\n');
                const charCount = fileContent.length;
                const wordCount = fileContent.split(/\s+/).filter(Boolean).length;
                
                console.log(`行数: ${lines.length}`);
                console.log(`字符数: ${charCount}`);
                console.log(`单词数: ${wordCount}`);
                
                // 显示文件内容预览
                console.log('\n文件内容预览 (前200字符):');
                if (fileContent.length > 0) {
                    console.log('----------------------------------------');
                    console.log(fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : ''));
                    console.log('----------------------------------------');
                } else {
                    console.log('(空文件或无打开的文件)');
                }
            } else {
                console.log('文件内容不是字符串格式');
                console.log(fileContent);
            }
            
            return fileContent;
        } else if (response.parsedResponse && response.parsedResponse.error) {
            console.log(`\n错误: ${response.parsedResponse.error}`);
            return null;
        } else {
            console.log('\n响应中没有有效的内容或格式不正确');
            return null;
        }
    } catch (error) {
        console.error(`\n测试获取当前文件内容时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testGetOpenInEditorFileText(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetOpenInEditorFileText };
