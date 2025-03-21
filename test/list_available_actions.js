const { findMCPServerPort, makeRequest, buildRequestBody, parseResponseContent, displayRawResponse } = require('./utils');

/**
 * 测试获取可用操作列表功能，并格式化输出
 * @param {number} port 端口号
 */
async function testListAvailableActions(port) {
    console.log(`\n========== 测试获取可用操作列表功能 ==========`);

    try {
        // 构造请求体
        const requestBody = buildRequestBody("list_available_actions", {});

        console.log('\n请求信息:');
        console.log(`URL: http://localhost:${port}/api/mcp/list_available_actions`);
        console.log(`Method: POST`);
        console.log(`请求数据: ${JSON.stringify(requestBody)}`);

        // 发送请求
        console.log('\n发送请求...');
        const response = await makeRequest(port, '/api/mcp/list_available_actions', 'POST', requestBody);
        console.log('收到响应。');

        // 显示原始响应数据
        displayRawResponse(response);

        // 解析响应
        const { actions, id, isError, originalResponse } = parseCompleteResponse(response);
        
        // 格式化输出完整的响应结构，但内容部分替换为实际解析出的操作项
        console.log('\n格式化响应结构:');
        console.log(`{
  "jsonrpc": "2.0",
  "id": ${id},
  "result": {
    "content": [`);

        // 按数组格式逐行输出操作项
        actions.forEach((action, index) => {
            const comma = index < actions.length - 1 ? ',' : '';
            console.log(`      {
        "id": "${action.id}",
        "text": "${action.text}"
      }${comma}`);
        });

        console.log(`    ]
  },
  "isError": ${isError}
}`);
        
        console.log(`\n✅ 响应 ID: ${id}, isError: ${isError}`);
        console.log(`\n解析结果: 找到 ${actions.length} 个操作项`);

        if (actions.length > 0) {
            // 设定列宽
            const ID_WIDTH = 50;
            const NAME_WIDTH = 40;

            // 表头
            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');
            console.log(`| ${'操作 ID'.padEnd(ID_WIDTH)} | ${'名称'.padEnd(NAME_WIDTH)} |`);
            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');

            // 按 ID 排序后格式化输出
            actions.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")))
                .forEach(action => {
                    const id = String(action.id || "").padEnd(ID_WIDTH);
                    const name = String(action.text || "").padEnd(NAME_WIDTH);
                    console.log(`| ${id} | ${name} |`);
                });

            console.log('+' + '-'.repeat(ID_WIDTH) + '+' + '-'.repeat(NAME_WIDTH) + '+');

            // 统计各首字母操作数量
            const groupedByFirstLetter = {};
            actions.forEach(action => {
                if (!action.id) return;
                const firstChar = String(action.id).charAt(0).toUpperCase();
                if (firstChar) {
                    groupedByFirstLetter[firstChar] = (groupedByFirstLetter[firstChar] || 0) + 1;
                }
            });

            console.log('\n操作 ID 首字母分布:\n');

            // 分布统计表头
            console.log('+----------+-----------+');
            console.log('| 首字母   | 数量      |');
            console.log('+----------+-----------+');

            // 分布统计内容
            if (Object.keys(groupedByFirstLetter).length > 0) {
                Object.keys(groupedByFirstLetter).sort().forEach(letter => {
                    console.log(`| ${letter.padEnd(8)} | ${String(groupedByFirstLetter[letter]).padEnd(9)} |`);
                });
            } else {
                console.log('| 无数据   | 0         |');
            }

            console.log('+----------+-----------+');

            return { success: true, content: actions, id, isError };
        } else {
            console.log('❌ 没有找到有效的操作数据。');
            return { success: false, error: "无有效操作数据", id, isError };
        }
    } catch (error) {
        console.error(`❌ 测试获取可用操作列表功能时出错:`, error);
        throw error;
    }
}

/**
 * 全面解析响应，提取操作列表、ID和isError
 * @param {any} response 原始响应
 * @returns {Object} 包含actions数组、id和isError的对象
 */
function parseCompleteResponse(response) {
    // 默认值
    let actions = [];
    let id = "unknown";
    let isError = false;
    let originalResponse = response;
    
    // 如果响应是对象
    if (typeof response === 'object' && response !== null) {
        // 提取ID
        id = response.id || id;
        
        // 提取isError
        isError = response.isError === true;
        
        // 如果响应对象有result属性
        if (response.result) {
            // 如果result.content是数组，检查是否包含正确的操作项
            if (Array.isArray(response.result.content)) {
                // 遍历检查是否有需要进一步解析的字符串项
                const nestedActions = [];
                
                response.result.content.forEach(item => {
                    // 检查是否有需要特殊处理的项
                    if (item && typeof item.text === 'string' && item.text.includes('[{') && item.text.includes('id') && item.text.includes('text')) {
                        // 这是一个包含嵌套JSON的文本字段，需要提取实际操作
                        const extractedActions = extractActionsFromString(item.text);
                        if (extractedActions.length > 0) {
                            nestedActions.push(...extractedActions);
                        }
                    } else if (item && item.id && item.text) {
                        // 这是一个正常的操作项
                        nestedActions.push(item);
                    }
                });
                
                // 如果找到了嵌套操作，使用它们
                if (nestedActions.length > 0) {
                    actions = nestedActions;
                } else {
                    // 否则使用原始数组
                    actions = response.result.content;
                }
            }
            // 如果result.content是字符串，尝试解析
            else if (typeof response.result.content === 'string') {
                actions = extractActionsFromString(response.result.content);
            }
            
            // 检查isError可能在result中
            if (response.result.isError !== undefined) {
                isError = response.result.isError === true;
            }
        }
    }
    // 如果响应是字符串
    else if (typeof response === 'string') {
        // 尝试解析字符串为JSON对象
        try {
            const parsedResponse = JSON.parse(response);
            return parseCompleteResponse(parsedResponse);
        } catch (e) {
            // 如果解析失败，尝试直接从字符串中提取操作
            actions = extractActionsFromString(response);
            
            // 尝试从字符串中提取ID
            const idMatch = response.match(/"id"\s*:\s*(\d+)/);
            if (idMatch && idMatch[1]) {
                id = idMatch[1];
            }
            
            // 尝试从字符串中提取isError
            isError = response.includes('"isError"\s*:\s*true');
        }
    }
    
    // 如果还是没有找到操作，尝试最后的方法
    if (actions.length === 0) {
        // 将整个响应转换为字符串，尝试提取任何可能的操作
        const responseStr = JSON.stringify(response);
        const extractedActions = extractActionsFromString(responseStr);
        if (extractedActions.length > 0) {
            actions = extractedActions;
        }
    }
    
    return { actions, id, isError, originalResponse };
}

/**
 * 从字符串中提取操作列表
 * @param {string} str 可能包含操作列表的字符串
 * @returns {Array} 操作列表数组
 */
function extractActionsFromString(str) {
    if (typeof str !== 'string') {
        return [];
    }
    
    // 尝试直接解析字符串中的JSON数组
    try {
        // 清理常见的转义字符
        let cleanedStr = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        
        // 如果字符串是以引号包裹的，尝试移除外围引号
        if (cleanedStr.startsWith('"') && cleanedStr.endsWith('"')) {
            cleanedStr = cleanedStr.substring(1, cleanedStr.length - 1);
            // 再次清理转义字符
            cleanedStr = cleanedStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        // 查找类似 [{...}] 的模式 - JSON数组
        const arrayMatch = cleanedStr.match(/\[\s*{.*}\s*\]/s);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
        
        // 尝试特殊情况 - 从你提供的响应示例看，可能有"[{...}]"这样的格式
        const quotedArrayMatch = cleanedStr.match(/"(\[\s*{.*}\s*\])"/s);
        if (quotedArrayMatch && quotedArrayMatch[1]) {
            // 再次清理引号内的内容
            const innerContent = quotedArrayMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            try {
                return JSON.parse(innerContent);
            } catch (e) {
                // 忽略解析错误
            }
        }
    } catch (err) {
        // 忽略解析错误，继续尝试其他方法
    }
    
    // 使用正则表达式提取 id 和 text 对
    const result = [];
    const pattern = /"id"\s*:\s*"([^"]+)"\s*,\s*"text"\s*:\s*"([^"]+)"/g;
    let match;
    
    while ((match = pattern.exec(str)) !== null) {
        if (match.length >= 3) {
            result.push({
                id: match[1],
                text: match[2]
            });
        }
    }
    
    return result;
}

// 如果直接运行此脚本
if (require.main === module) {
    (async () => {
        try {
            const port = await findMCPServerPort();
            await testListAvailableActions(port);
        } catch (error) {
            console.error(`测试失败: ${error.message}`);
            process.exit(1);
        }
    })();
}

module.exports = { testListAvailableActions };
