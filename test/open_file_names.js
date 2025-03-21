const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');
const path = require('path');

/**
 * 测试获取所有打开的文件名称
 * @param {number} port 端口号
 */
async function testGetAllOpenFileNames(port) {
    console.log(`\n========== 测试获取所有打开的文件名称 ==========`);
    
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
        
        // 打印格式化的响应结构
        console.log('\n格式化响应结构:');
        console.log(JSON.stringify(response, (key, value) => key === '__originalResponseText' ? undefined : value, 2));
        
        // 解析内容
        const parsedContent = parseResponseContent(response);
        
        if (parsedContent !== null) {
            // 检查返回内容是否为字符串
            if (typeof parsedContent === 'string') {
                const files = parsedContent.split('\n').filter(f => f.trim() !== '');
                
                if (files.length > 0) {
                    console.log(`\n所有打开的文件 (共 ${files.length} 个):`);
                    
                    // 按文件扩展名分类
                    const filesByExtension = {};
                    files.forEach(file => {
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
                    
                    // 显示完整路径
                    console.log('\n完整路径:');
                    files.forEach((file, index) => {
                        console.log(`${index+1}. ${file}`);
                    });
                    
                    // 只显示文件名
                    console.log('\n只显示文件名:');
                    files.forEach((file, index) => {
                        console.log(`${index+1}. ${path.basename(file)}`);
                    });
                } else {
                    console.log('\n没有打开的文件');
                }
                
                return files;
            } else {
                console.log('\n返回格式不是预期的字符串:');
                console.log(parsedContent);
            }
        } else {
            console.log('\n响应中没有有效的内容或格式不正确');
        }
        
        return null;
    } catch (error) {
        console.error(`\n测试获取所有打开文件名称时出错:`, error);
        throw error;
    }
}

/**
 * 测试通过状态API获取打开的文件
 * @param {number} port 端口号
 */
async function testGetAllOpenFilesViaStatus(port) {
    console.log(`\n========== 测试通过状态API获取所有打开的文件 ==========`);
    
    try {
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/status`);
        console.log(`Method: GET`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/status', 'GET');
        console.log('收到响应。');
        
        // 显示原始响应数据
        displayRawResponse(response);
        
        // 打印格式化的响应结构
        console.log('\n格式化响应结构:');
        console.log(JSON.stringify(response, (key, value) => key === '__originalResponseText' ? undefined : value, 2));
        
        // 解析内容
        if (response && response.result && response.result.environment && response.result.environment.openFiles) {
            const files = response.result.environment.openFiles;
            
            if (files.length > 0) {
                console.log(`\n所有打开的文件 (共 ${files.length} 个):`);
                
                // 按文件扩展名分类
                const filesByExtension = {};
                files.forEach(file => {
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
                
                // 显示完整路径
                console.log('\n完整路径:');
                files.forEach((file, index) => {
                    console.log(`${index+1}. ${file}`);
                });
                
                // 只显示文件名
                console.log('\n只显示文件名:');
                files.forEach((file, index) => {
                    console.log(`${index+1}. ${path.basename(file)}`);
                });
            } else {
                console.log('\n没有打开的文件');
            }
            
            return files;
        } else {
            console.log('\n响应中没有文件信息');
        }
        
        return null;
    } catch (error) {
        console.error(`\n测试通过状态API获取文件时出错:`, error);
        throw error;
    }
}

/**
 * 运行所有测试
 */
async function runTests() {
    try {
        console.log('==========================================');
        console.log('     测试获取打开的文件名');
        console.log('==========================================');
        
        // 查找MCP服务器端口
        const port = await findMCPServerPort();
        
        // 测试获取所有打开的文件名称（通过专用API）
        const filesFromAPI = await testGetAllOpenFileNames(port);
        
        // 测试通过状态API获取打开的文件
        const filesFromStatus = await testGetAllOpenFilesViaStatus(port);
        
        // 比较两种方法的结果
        if (filesFromAPI && filesFromStatus) {
            console.log('\n比较两个API的结果:');
            
            // 转换为集合进行比较
            const apiSet = new Set(filesFromAPI);
            const statusSet = new Set(filesFromStatus);
            
            // 检查API特有的文件
            const apiOnly = filesFromAPI.filter(file => !statusSet.has(file));
            
            // 检查Status特有的文件
            const statusOnly = filesFromStatus.filter(file => !apiSet.has(file));
            
            // 检查共有的文件
            const common = filesFromAPI.filter(file => statusSet.has(file));
            
            console.log(`共有文件: ${common.length} 个`);
            console.log(`仅在专用API中: ${apiOnly.length} 个`);
            console.log(`仅在状态API中: ${statusOnly.length} 个`);
            
            if (apiOnly.length > 0) {
                console.log('\n仅在专用API中的文件:');
                apiOnly.forEach((file, index) => {
                    console.log(`  ${index+1}. ${file}`);
                });
            }
            
            if (statusOnly.length > 0) {
                console.log('\n仅在状态API中的文件:');
                statusOnly.forEach((file, index) => {
                    console.log(`  ${index+1}. ${file}`);
                });
            }
        }
        
        console.log('\n==========================================');
        console.log('     所有测试完成!');
        console.log('==========================================');
    } catch (error) {
        console.error(`\n测试过程中出错: ${error.message}`);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    runTests();
}

module.exports = { 
    testGetAllOpenFileNames,
    testGetAllOpenFilesViaStatus
};
