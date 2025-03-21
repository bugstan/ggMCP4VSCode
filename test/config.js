/**
 * VSCode MCP 服务器 API 测试工具的配置文件
 * 集中管理URL前缀、端口范围等配置项
 */

const config = {
    // URL 前缀配置
    paths: {
        // 标准路径前缀，使用 '/api/mcp/'
        standard: '/api/mcp/',
        // 备份保留
        alternative: '/api/mcp/'
    },
    
    // 端口配置
    ports: {
        // 端口范围起始值
        start: 9960,
        // 端口范围结束值
        end: 9990,
        // 默认端口（如果指定）
        default: null
    },
    
    // 超时设置（毫秒）
    timeout: 10000,
    
    // 控制台颜色
    colors: {
        reset: '\x1b[0m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        red: '\x1b[31m',
        cyan: '\x1b[36m',
        magenta: '\x1b[35m'
    },
    
    // 关闭调试日志
    debug: false
};

module.exports = config;