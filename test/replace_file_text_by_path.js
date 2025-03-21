const { findMCPServerPort, makeRequest, buildRequestBody, displayResponse, getStandardApiPath } = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * 测试通过路径替换文件内容
 * @param {number} port 端口号
 * @param {string} pathInProject 文件在项目中的路径
 * @param {string} text 要替换的文本内容
 */
async function testReplaceFileTextByPath(port, pathInProject, text) {
    console.log(`\n========== 测试通过路径替换文件内容 ==========`);
    console.log(`目标文件路径: ${pathInProject}`);
    
    try {
        // 检查是否指定了有效的目标文件路径
        if (!pathInProject) {
            throw new Error('请指定有效的目标文件路径');
        }
        
        // 构造请求体
        const requestBody = buildRequestBody("replace_file_text_by_path", { 
            pathInProject, 
            text 
        });
        
        // 获取标准API路径
        const apiPath = getStandardApiPath('replace_file_text_by_path');
        
        // 打印请求信息
        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}${apiPath}`);
        console.log(`Method: POST`);
        console.log(`请求数据参数:`);
        console.log(`  pathInProject: ${pathInProject}`);
        console.log(`  text: (文本长度: ${text.length} 字符)`);
        
        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, apiPath, 'POST', requestBody);
        console.log('收到响应。');
        
        // 只显示原始数据和JSON格式化后的输出
        displayResponse(response);
        
        return response.parsedResponse;
    } catch (error) {
        console.error(`\n测试通过路径替换文件内容时出错:`, error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            
            // 获取参数
            const args = process.argv.slice(2);
            let filePath = '';
            let textContent = '这是测试内容，由replace_file_text_by_path.js生成。\n时间戳: ' + new Date().toISOString();
            let textFile = '';
            
            // 解析参数
            for (let i = 0; i < args.length; i++) {
                if (args[i].startsWith('--path=')) {
                    filePath = args[i].split('=')[1];
                } else if ((args[i] === '--path' || args[i] === '-f') && i + 1 < args.length) {
                    filePath = args[i + 1];
                    i++; // 跳过下一个参数
                } else if (args[i].startsWith('--text=')) {
                    textContent = args[i].split('=')[1];
                } else if ((args[i] === '--text' || args[i] === '-t') && i + 1 < args.length) {
                    textContent = args[i + 1];
                    i++; // 跳过下一个参数
                } else if (args[i].startsWith('--file=')) {
                    textFile = args[i].split('=')[1];
                } else if ((args[i] === '--file' || args[i] === '-tf') && i + 1 < args.length) {
                    textFile = args[i + 1];
                    i++; // 跳过下一个参数
                }
            }
            
            // 检查是否指定了文件路径
            if (!filePath) {
                console.error('请指定目标文件路径');
                console.log('用法: node test/replace_file_text_by_path.js --path=/path/to/target/file [--text="新内容" | --file=/path/to/source/file]');
                process.exit(1);
            }
            
            // 如果指定了文本文件，从文件读取内容
            if (textFile) {
                try {
                    const absPath = path.resolve(__dirname, '..', textFile.startsWith('/') ? textFile.substring(1) : textFile);
                    textContent = fs.readFileSync(absPath, 'utf8');
                    console.log(`从文件 ${textFile} 读取内容, 长度: ${textContent.length} 字符`);
                } catch (err) {
                    console.error(`读取文件 ${textFile} 失败:`, err);
                    process.exit(1);
                }
            }
            
            await testReplaceFileTextByPath(port, filePath, textContent);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testReplaceFileTextByPath };
