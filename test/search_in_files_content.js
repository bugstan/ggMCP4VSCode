const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayResponse, getStandardApiPath } = require('./utils');

/**
 * 测试在文件内容中搜索文本
 * @param {number} port 端口号
 * @param {string} searchText 要搜索的文本
 */
async function testSearchInFilesContent(port, searchText) {
    console.log(`\n========== 测试在文件内容中搜索文本 ==========`);
    console.log(`搜索文本: "${searchText}"`);
    
    try {
        // 构造请求体
        const requestBody = buildRequestBody("search_in_files_content", { searchText });
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('search_in_files_content');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath}`);
        console.log(`Method: POST`);
        console.log(`请求数据:\n${JSON.stringify(requestBody, null, 2)}`);
        
        // 发送请求
        console.log('\n发送请求...');
        console.log('(这可能需要一些时间，取决于项目大小...)\n');
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        console.log('收到响应。');
        
        // 显示响应数据
        displayResponse(response);
        
        // 解析内容
        const parsedContent = parseResponseContent(response);
        
        if (parsedContent) {
            console.log('\n解析后的搜索结果:');
            
            if (parsedContent.results && Array.isArray(parsedContent.results)) {
                const { results, searchDirectory } = parsedContent;
                
                console.log(`搜索目录: ${searchDirectory || '(未指定)'}`);
                console.log(`找到 ${results.length} 个包含 "${searchText}" 的文件:\n`);
                
                if (results.length > 0) {
                    // 按扩展名分组文件
                    const filesByExtension = {};
                    results.forEach(file => {
                        const ext = file.name.split('.').pop().toLowerCase() || 'unknown';
                        if (!filesByExtension[ext]) {
                            filesByExtension[ext] = [];
                        }
                        filesByExtension[ext].push(file);
                    });
                    
                    // 显示扩展名统计
                    console.log('文件类型统计:');
                    Object.entries(filesByExtension).sort().forEach(([ext, files]) => {
                        console.log(`- ${ext}: ${files.length} 个文件`);
                    });
                    
                    // 显示匹配文件列表
                    console.log('\n匹配文件列表:');
                    results.forEach((file, index) => {
                        console.log(`${index+1}. ${file.name}`);
                        console.log(`   路径: ${file.relativePath || file.path}`);
                    });
                } else {
                    console.log('没有找到包含搜索文本的文件');
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
        console.error(`\n测试在文件内容中搜索文本时出错:`, error);
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
            let searchText = "import"; // 默认搜索文本
            
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
            
            await testSearchInFilesContent(port, searchText);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testSearchInFilesContent };
