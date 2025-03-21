const http = require('http');
const path = require('path');
const config = require('./config');

/**
 * 工具模块 - 提供通用函数用于测试VSCode MCP服务器API
 */

// 从配置中获取颜色
const colors = config.colors;

// 获取命令行参数中的端口号，如果没有则返回null
function getPortFromArgs() {
    // 获取命令行参数
    const args = process.argv.slice(2);
    
    // 查找格式为 --port=<number> 或 -p=<number> 或 -p <number> 的参数
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--port=')) {
            const port = parseInt(args[i].split('=')[1]);
            return isNaN(port) ? null : port;
        } else if (args[i].startsWith('-p=')) {
            const port = parseInt(args[i].split('=')[1]);
            return isNaN(port) ? null : port;
        } else if ((args[i] === '--port' || args[i] === '-p') && i + 1 < args.length) {
            const port = parseInt(args[i + 1]);
            return isNaN(port) ? null : port;
        }
    }
    
    return config.ports.default;
}

/**
 * 检查测试脚本名称与请求方法是否一致
 * @param {string} scriptPath 测试脚本路径
 * @param {string} requestMethod 实际使用的请求方法
 * @returns {boolean} 是否一致
 */
function checkScriptNameMethodConsistency(scriptPath, requestMethod) {
    if (!scriptPath) return true; // 如果没有提供路径，默认为一致
    
    // 提取脚本基本名称（不含扩展名）
    const scriptBaseName = path.basename(scriptPath, '.js');
    
    // 从请求方法中提取名称（移除/mcp/或/api/mcp/前缀）
    let methodName = requestMethod;
    if (methodName.startsWith(config.paths.standard)) {
        methodName = methodName.substring(config.paths.standard.length);
    } else if (methodName.startsWith(config.paths.alternative)) {
        methodName = methodName.substring(config.paths.alternative.length);
    }
    
    // 比较脚本名称与请求方法
    const isConsistent = scriptBaseName === methodName;
    
    // 如果不一致，输出警告
    if (!isConsistent && config.debug) {
        console.log(colors.yellow + `警告: 脚本名称 "${scriptBaseName}" 与请求方法 "${methodName}" 不一致` + colors.reset);
    }
    
    return isConsistent;
}

/**
 * 获取当前执行的脚本路径
 * @returns {string|null} 脚本路径或null
 */
function getCurrentScriptPath() {
    if (require.main) {
        return require.main.filename;
    }
    return null;
}

/**
 * 查找可用的VSCode MCP服务器端口
 * @param {number} portStart 起始端口号（从配置中读取默认值）
 * @param {number} portEnd 结束端口号（从配置中读取默认值）
 * @returns {Promise<number>} 找到的可用端口
 */
async function findMCPServerPort(portStart = config.ports.start, portEnd = config.ports.end) {
    // 如果传入了命令行参数中的端口号，则直接使用
    const cmdPort = getPortFromArgs();
    if (cmdPort) {
        console.log(`使用命令行指定的端口 ${cmdPort}`);
        return cmdPort;
    }
    
    // 如果没有指定端口，使用默认的起始端口
    console.log(`未指定端口，使用默认起始端口 ${portStart}`);
    return portStart;
}

/**
 * 发送HTTP请求
 * @param {number} port 端口号
 * @param {string} path 请求路径
 * @param {string} method HTTP方法
 * @param {object|null} body 请求体
 * @returns {Promise<object>} 响应数据
 */
async function makeRequest(port, path, method, body = null) {
    try {
        const response = await _makeRequestInternal(port, path, method, body);
        return response;
    } catch (error) {
        // 不再尝试备用路径，直接抛出错误
        throw error;
    }
}

/**
 * 内部HTTP请求实现
 */
function _makeRequestInternal(port, path, method, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // 保存原始文本响应
                        const originalResponseText = data;
                        let parsedResponse = null;
                        
                        // 尝试解析为 JSON
                        try {
                            parsedResponse = JSON.parse(data);
                        } catch (e) {
                            // 如果不能解析为 JSON，直接返回文本
                            parsedResponse = data;
                        }
                        
                        // 同时返回原始响应和解析后的响应
                        resolve({
                            rawResponse: originalResponseText,
                            parsedResponse: parsedResponse,
                            requestedPath: path, // 记录实际使用的请求路径
                            requestMethod: method // 记录使用的HTTP方法
                        });
                    } catch (e) {
                        console.warn('警告: 处理响应时出错', e);
                        // 返回一个只包含原始文本的对象
                        resolve({
                            rawResponse: data,
                            parsedResponse: null,
                            requestedPath: path,
                            requestMethod: method
                        });
                    }
                } else {
                    reject(new Error(`HTTP请求失败，状态码: ${res.statusCode}，响应: ${data}`));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        
        req.end();
    });
}

/**
 * 构造API请求正文（简化后的格式，直接发送工具参数）
 * @param {string} toolName 工具名称
 * @param {object} args 请求参数
 * @returns {object} 请求体对象
 */
function buildRequestBody(toolName, args = {}) {
    // 返回直接的参数对象
    return args;
}

/**
 * 获取标准API路径
 * @param {string} methodName 方法名称
 * @returns {string} 完整的API路径
 */
function getStandardApiPath(methodName) {
    return config.paths.standard + methodName;
}

/**
 * 解析响应内容
 * @param {object} response 响应对象
 * @returns {object|null} 解析后的内容或null
 */
function parseResponseContent(response) {
    if (!response || !response.parsedResponse) {
        return null;
    }
    
    // 尝试获取内容
    const parsed = response.parsedResponse;
    
    // 检查标准MCP响应格式
    if (parsed && parsed.status !== undefined && parsed.error !== undefined) {
        if (parsed.status !== null) {
            // 成功响应，返回status字段的内容
            return parsed.status;
        } else {
            // 错误响应，返回null
            console.log(colors.red + '错误: ' + parsed.error + colors.reset);
            return null;
        }
    }
    
    // 返回整个解析后的响应
    return parsed;
}

/**
 * 显示响应数据（只显示原始数据和JSON格式化后的输出，格式化的输出显示为绿色）
 * @param {object} response 包含rawResponse和parsedResponse的对象
 */
function displayResponse(response) {
    // 显示原始响应数据
    console.log('\n原始响应数据:');
    console.log('----------------------------------------');
    console.log(response.rawResponse);
    console.log('----------------------------------------');

    // 显示JSON格式化后的输出（绿色）
    console.log('\nJSON格式化后的输出:');
    console.log('----------------------------------------');
    if (response.parsedResponse !== null) {
        console.log(colors.green + JSON.stringify(response.parsedResponse, null, 2) + colors.reset);
    } else {
        console.log(colors.red + '响应不是有效的JSON' + colors.reset);
    }
    console.log('----------------------------------------');
    
    // 显示实际使用的请求路径和方法（如果有记录）
    if (response.requestedPath) {
        console.log(`\n实际请求信息:`);
        console.log(`路径: ${response.requestedPath}`);
        if (response.requestMethod) {
            console.log(`方法: ${response.requestMethod}`);
        }
    }
}

/**
 * 显示原始响应与解析后的响应（用于SearchInFilesContent）
 * @param {object} response 响应对象 
 */
function displayRawResponse(response) {
    // 显示原始响应数据
    console.log('\n原始响应数据:');
    console.log('----------------------------------------');
    console.log(response.rawResponse);
    console.log('----------------------------------------');

    // 显示JSON格式化后的输出
    console.log('\nJSON格式化后的输出:');
    console.log('----------------------------------------');
    if (response.parsedResponse !== null) {
        console.log(JSON.stringify(response.parsedResponse, null, 2));
    } else {
        console.log('响应不是有效的JSON');
    }
    console.log('----------------------------------------');
}

// 导出函数
module.exports = {
    findMCPServerPort,
    makeRequest,
    buildRequestBody,
    displayResponse,
    displayRawResponse,
    parseResponseContent,
    getPortFromArgs,
    colors,
    getStandardApiPath,
    checkScriptNameMethodConsistency,
    config
};