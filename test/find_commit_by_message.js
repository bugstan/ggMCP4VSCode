const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * 测试根据消息查找提交
 * @param {number} port 端口号
 * @param {string} searchText 要搜索的提交消息文本
 */
async function testFindCommitByMessage(port, searchText) {
    console.log(`\n========== 测试根据消息查找提交 ==========`);
    console.log(`搜索文本: "${searchText}"`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("find_commit_by_message", { text: searchText });
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/find_commit_by_message`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/find_commit_by_message', 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示原始响应数据
        displayRawResponse(response);
        
        // 打印格式化的响应结构
        console.log('\n格式化响应结构:');
        console.log(JSON.stringify(response, (key, value) => key === '__originalResponseText' ? undefined : value, 2));
        
        // 解析内容
        const parsedContent = parseResponseContent(response);
        
        if (parsedContent) {
            console.log('\n解析后的提交搜索结果:');
            
            if (Array.isArray(parsedContent)) {
                const commits = parsedContent;
                
                console.log(`共找到 ${commits.length} 个匹配的提交:`);
                
                if (commits.length > 0) {
                    // 显示提交列表
                    console.log('\n提交哈希列表:');
                    commits.forEach((commit, index) => {
                        console.log(`${index+1}. ${commit}`);
                    });
                    
                    // 提示如何查看提交详情
                    console.log('\n提示: 可以使用以下命令查看提交详情:');
                    console.log(`git show ${commits[0]}`);
                } else {
                    console.log('没有找到匹配的提交');
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
        console.error(`\n测试根据消息查找提交时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            
            // 获取搜索文本参数
            const args = process.argv.slice(2);
            let searchText = ""; // 默认搜索文本为空字符串
            
            // 查找搜索参数
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--text=')) {
                    searchText = args[i].split('=')[1];
                    break;
                } else if ((args[i] === '--text' || args[i] === '-t') && i + 1 < args.length) {
                    searchText = args[i + 1];
                    break;
                }
            }
            
            // 如果没有提供搜索文本，则使用默认值
            if (!searchText) {
                searchText = "init"; // 默认搜索"init"，通常会匹配初始提交
                console.log(`未提供搜索文本，使用默认值: "${searchText}"`);
            }
            
            await testFindCommitByMessage(port, searchText);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testFindCommitByMessage };
