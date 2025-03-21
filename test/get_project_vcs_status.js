const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * 测试获取项目版本控制状态
 * @param {number} port 端口号
 */
async function testGetProjectVcsStatus(port) {
    console.log(`\n========== 测试获取项目版本控制状态 ==========`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("get_project_vcs_status");
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/get_project_vcs_status`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/get_project_vcs_status', 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示原始响应数据
        displayRawResponse(response);
        
        // 打印格式化的响应结构
        console.log('\n格式化响应结构:');
        console.log(JSON.stringify(response, (key, value) => key === '__originalResponseText' ? undefined : value, 2));
        
        // 解析内容
        const parsedContent = parseResponseContent(response);
        
        if (parsedContent) {
            console.log('\n解析后的版本控制状态:');
            
            if (Array.isArray(parsedContent)) {
                const changes = parsedContent;
                
                console.log(`共发现 ${changes.length} 个变更文件:`);
                
                if (changes.length > 0) {
                    // 按变更类型分组
                    const changesByType = {};
                    changes.forEach(change => {
                        const type = change.type || 'UNKNOWN';
                        if (!changesByType[type]) {
                            changesByType[type] = [];
                        }
                        changesByType[type].push(change);
                    });
                    
                    // 显示变更类型统计
                    console.log('\n变更类型统计:');
                    Object.entries(changesByType).sort().forEach(([type, files]) => {
                        console.log(`- ${type}: ${files.length} 个文件`);
                    });
                    
                    // 显示变更文件列表
                    console.log('\n变更文件列表:');
                    for (const [type, files] of Object.entries(changesByType)) {
                        console.log(`\n${type}:`);
                        files.forEach((change, index) => {
                            console.log(`  ${index+1}. ${change.path}`);
                        });
                    }
                } else {
                    console.log('没有变更文件 (工作区是干净的)');
                }
            } else {
                console.log('响应格式不符合预期:');
                console.log(parsedContent);
            }
            
            return parsedContent;
        } else {
            console.log('\n响应中没有有效的内容或格式不正确');
        }
        
        return null;
    } catch (error) {
        console.error(`\n测试获取项目版本控制状态时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testGetProjectVcsStatus(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testGetProjectVcsStatus };
