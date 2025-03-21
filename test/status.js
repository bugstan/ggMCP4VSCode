const { findMCPServerPort, makeRequest, displayResponse } = require('./utils');

/**
 * 测试获取工作区状态
 * @param {number} port 端口号
 */
async function testStatus(port) {
    console.log(`\n========== 测试获取工作区状态 ==========`);
    
    try {
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/mcp/status`);
        console.log(`Method: GET`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/mcp/status', 'GET');
        console.log('收到响应。');
        
        // 显示响应数据
        displayResponse(response);
        
        // 解析内容
        if (response.parsedResponse && response.parsedResponse.result) {
            console.log('\n解析后的工作区状态:');
            
            // 显示服务器状态
            if (response.parsedResponse.result.status) {
                console.log(`服务器状态: ${response.parsedResponse.result.status}`);
            }
            
            // 显示环境信息
            if (response.parsedResponse.result.environment) {
                const env = response.parsedResponse.result.environment;
                console.log('\n环境信息:');
                console.log(`工作区根目录: ${env.workspaceRoot || '(未设置)'}`);
                console.log(`当前活动文件: ${env.activeFile || '(无)'}`);
                console.log(`当前目录: ${env.currentDirectory || '(未设置)'}`);
                
                // 显示打开的文件
                if (env.openFiles && Array.isArray(env.openFiles)) {
                    const openFiles = env.openFiles;
                    
                    console.log(`\n打开的文件 (共 ${openFiles.length} 个):`);
                    
                    if (openFiles.length > 0) {
                        // 按文件扩展名分类
                        const filesByExtension = {};
                        
                        openFiles.forEach(file => {
                            const ext = file.split('.').pop().toLowerCase() || 'unknown';
                            if (!filesByExtension[ext]) {
                                filesByExtension[ext] = [];
                            }
                            filesByExtension[ext].push(file);
                        });
                        
                        // 显示分类统计
                        console.log('\n文件类型统计:');
                        Object.entries(filesByExtension).sort().forEach(([ext, files]) => {
                            console.log(`- ${ext}: ${files.length} 个文件`);
                        });
                        
                        // 显示文件列表
                        console.log('\n文件列表:');
                        openFiles.forEach((file, index) => {
                            console.log(`  ${index+1}. ${file}`);
                        });
                    } else {
                        console.log('  (无打开的文件)');
                    }
                }
            } else {
                console.log('响应中没有工作区环境信息');
            }
            
            return response.parsedResponse.result;
        } else {
            console.log('\n响应中没有有效的内容或格式不正确');
        }
        
        return null;
    } catch (error) {
        console.error(`\n测试获取工作区状态时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testStatus(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testStatus };
