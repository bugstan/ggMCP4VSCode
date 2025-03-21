const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * 测试获取所有打开的文件路径
 * @param {number} port 端口号
 */
async function testGetAllOpenFilePaths(port) {
    console.log(`\n========== 测试获取所有打开的文件路径 ==========`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_all_open_file_paths");
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/get_all_open_file_paths`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/get_all_open_file_paths', 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示原始响应数据
        displayRawResponse(response);
        
        // 提取文件路径列表
        let filePathsContent = '';
        
        // 检查标准格式：{ "status": "文件路径列表" }
        if (response && typeof response.status === 'string') {
            filePathsContent = response.status;
            console.log('\n✅ 使用标准格式: { "status": "文件路径列表" }');
        } 
        // 兼容其他可能的格式
        else if (response && response.result) {
            // 如果是result.content[0].text格式
            if (response.result.content && 
                Array.isArray(response.result.content) && 
                response.result.content[0] && 
                response.result.content[0].text) {
                filePathsContent = response.result.content[0].text;
                console.log('\n⚠️ 使用兼容格式: { "result": { "content": [{ "text": "文件路径列表" }] } }');
            }
            // 如果是result.content格式
            else if (response.result.content && typeof response.result.content === 'string') {
                filePathsContent = response.result.content;
                console.log('\n⚠️ 使用兼容格式: { "result": { "content": "文件路径列表" } }');
            }
            // 如果是result格式
            else if (typeof response.result === 'string') {
                filePathsContent = response.result;
                console.log('\n⚠️ 使用兼容格式: { "result": "文件路径列表" }');
            }
        }
        
        // 处理文件路径列表
        if (filePathsContent) {
            console.log('\n所有打开的文件:');
            const files = filePathsContent.split('\n').filter(f => f.trim() !== '');
            
            // 显示文件列表
            if (files.length > 0) {
                files.forEach((file, index) => {
                    console.log(`${index+1}. ${file}`);
                });
                
                // 格式化输出标准JSON格式
                console.log('\n标准JSON格式示例:');
                console.log(JSON.stringify({
                    status: filePathsContent
                }, null, 2));
                
                console.log(`\n✅ 总共 ${files.length} 个打开的文件`);
                return files;
            } else {
                console.log('(没有打开的文件)');
                
                // 格式化输出标准JSON格式
                console.log('\n标准JSON格式示例 (空列表):');
                console.log(JSON.stringify({
                    status: ""
                }, null, 2));
                
                return [];
            }
        } else {
            console.log('\n❌ 响应中没有找到文件路径列表');
            console.log('预期的标准格式:');
            console.log(JSON.stringify({
                status: "file1.js\nfile2.js\nfile3.js"
            }, null, 2));
        }
        
        return null;
    } catch (error) {
        console.error(`\n❌ 测试获取所有打开文件路径时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testGetAllOpenFilePaths(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetAllOpenFilePaths };
