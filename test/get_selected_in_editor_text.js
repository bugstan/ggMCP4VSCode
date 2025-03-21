const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * 测试获取选择的文本
 * @param {number} port 端口号
 */
async function testGetSelectedInEditorText(port) {
    console.log(`\n========== 测试获取当前选中的文本 ==========`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_selected_in_editor_text");
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/get_selected_in_editor_text`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/get_selected_in_editor_text', 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示原始响应数据
        displayRawResponse(response);
        
        // 打印格式化的响应结构
        console.log('\n格式化响应结构:');
        console.log(JSON.stringify(response, (key, value) => key === '__originalResponseText' ? undefined : value, 2));
        
        // 解析内容
        const parsedContent = parseResponseContent(response);
        
        if (parsedContent !== null) {
            console.log('\n当前选中的文本分析:');
            
            if (typeof parsedContent === 'string') {
                if (parsedContent.length > 0) {
                    // 计算选中文本的统计信息
                    const lines = parsedContent.split('\n');
                    const charCount = parsedContent.length;
                    const wordCount = parsedContent.split(/\s+/).filter(Boolean).length;
                    
                    console.log(`行数: ${lines.length}`);
                    console.log(`字符数: ${charCount}`);
                    console.log(`单词数: ${wordCount}`);
                    
                    // 显示选中文本
                    console.log('\n选中内容:');
                    console.log('----------------------------------------');
                    console.log(parsedContent);
                    console.log('----------------------------------------');
                } else {
                    console.log('(没有选中的文本)');
                }
            } else {
                console.log('选中内容不是字符串格式');
                console.log(parsedContent);
            }
            
            return parsedContent;
        } else {
            console.log('\n响应中没有有效的内容或格式不正确');
        }
        
        return null;
    } catch (error) {
        console.error(`\n测试获取选中文本时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testGetSelectedInEditorText(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetSelectedInEditorText };
