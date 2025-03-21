import * as net from 'net';

/**
 * 扫描端口范围内的第一个可用端口
 * @param start 端口范围起始值
 * @param end 端口范围结束值
 * @returns 第一个可用端口或null
 */
export async function findAvailablePort(start: number, end: number): Promise<number | null> {
    // 验证端口范围
    if (start < 0 || start > 65535 || end < 0 || end > 65535 || start > end) {
        console.error(`无效的端口范围: ${start}-${end}`);
        return null;
    }
    
    for (let port = start; port <= end; port++) {
        try {
            if (await isPortAvailable(port)) {
                return port;
            }
        } catch (error) {
            console.error(`检查端口 ${port} 时出错:`, error);
            // 继续检查下一个端口
        }
    }
    return null;
}

/**
 * 检查指定端口是否可用
 * @param port 要检查的端口
 * @returns 端口是否可用
 */
function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void) => {
        const server = net.createServer();
        
        // 设置超时，防止长时间阻塞
        const timeout = setTimeout(() => {
            server.close();
            resolve(false);
        }, 1000);
        
        server.once('error', () => {
            clearTimeout(timeout);
            resolve(false);
        });
        
        server.once('listening', () => {
            clearTimeout(timeout);
            // 确保服务器关闭后再返回结果
            server.close(() => {
                resolve(true);
            });
        });
        
        try {
            server.listen(port);
        } catch (error) {
            clearTimeout(timeout);
            console.error(`尝试监听端口 ${port} 时出错:`, error);
            resolve(false);
        }
    });
}
