import * as vscode from 'vscode';
import { startMCPServer } from './server';

// 保存当前服务器端口的变量
let currentServerPort: number | null = null;

/**
 * 设置当前服务器端口
 * @param port 端口号
 */
export function setCurrentServerPort(port: number): void {
    currentServerPort = port;
}

/**
 * 获取当前服务器端口
 * @returns 当前端口号或null
 */
export function getCurrentServerPort(): number | null {
    return currentServerPort;
}

/**
 * 插件激活时的回调函数
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('VSCode MCP Server 插件已激活 - 为 VSCode 提供 MCP 协议服务');

    if (!vscode.workspace.workspaceFolders) {
        console.warn("⚠ 警告：workspaceFolders 为空，可能 VSCode 没有打开项目文件夹！");
    }

    // 日志输出基本信息
    console.log("visibleTextEditors:", vscode.window.visibleTextEditors);
    console.log("textDocuments:", vscode.workspace.textDocuments);
    console.log("workspaceFolders:", vscode.workspace.workspaceFolders);

    // 从配置中获取端口范围，默认为9960-9990
    const config = vscode.workspace.getConfiguration('ggMCP');
    const portStart = config.get<number>('portStart', 9960);
    const portEnd = config.get<number>('portEnd', 9990);

    // 保持对当前服务器disposable的引用
    let serverDisposable = startMCPServer(portStart, portEnd);

    // 注册状态栏图标
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(zap) VSCode MCP Server';
    
    // 更新状态栏提示信息的函数
    const updateStatusBarTooltip = () => {
        if (currentServerPort) {
            statusBarItem.tooltip = `VSCode MCP Server 正在端口 ${currentServerPort} 上运行，使用 /mcp/ 路径`;
        } else {
            statusBarItem.tooltip = `VSCode MCP Server 准备使用端口范围 ${portStart}-${portEnd}`;
        }
    };

    // 初始设置提示信息
    updateStatusBarTooltip();
    statusBarItem.show();

    // 注册命令：显示服务器状态
    const showStatusCommand = vscode.commands.registerCommand('ggMCP.showStatus', () => {
        if (currentServerPort) {
            vscode.window.showInformationMessage(`VSCode MCP Server 正在端口 ${currentServerPort} 上运行，使用标准 MCP 协议`);
        } else {
            vscode.window.showInformationMessage(`VSCode MCP Server 未运行或未获取到端口信息`);
        }
    });

    // 注册命令：重启服务器
    const restartCommand = vscode.commands.registerCommand('ggMCP.restart', () => {
        // 先处理旧的服务器
        serverDisposable.dispose();
        
        // 重置端口信息
        currentServerPort = null;
        updateStatusBarTooltip();
        
        // 启动新的服务器并保存引用
        serverDisposable = startMCPServer(portStart, portEnd);
        vscode.window.showInformationMessage('VSCode MCP Server 已重启');
    });

    // 监听配置变化
    const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(event => {
        // 检查我们关心的配置项是否发生变化
        const isRelevantChange = event.affectsConfiguration('ggMCP.portStart') || 
                                event.affectsConfiguration('ggMCP.portEnd');
                               
        if (isRelevantChange) {
            // 获取新的配置
            const newConfig = vscode.workspace.getConfiguration('ggMCP');
            const newPortStart = newConfig.get<number>('portStart', 9960);
            const newPortEnd = newConfig.get<number>('portEnd', 9990);
            
            // 如果端口范围变了，重启服务器
            if (newPortStart !== portStart || newPortEnd !== portEnd) {
                vscode.window.showInformationMessage(`端口配置已更改，正在重启VSCode MCP服务器...`);
                
                // 重启服务器
                serverDisposable.dispose();
                
                // 重置端口信息
                currentServerPort = null;
                updateStatusBarTooltip();
                
                serverDisposable = startMCPServer(newPortStart, newPortEnd);
            }
        }
    });

    // 将disposable对象添加到上下文中，以便在插件停用时进行清理
    context.subscriptions.push(serverDisposable);
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(showStatusCommand);
    context.subscriptions.push(restartCommand);
    context.subscriptions.push(configChangeSubscription);

    // 设置端口更新事件
    context.subscriptions.push(
        vscode.commands.registerCommand('ggMCP.updatePort', (port: number) => {
            currentServerPort = port;
            updateStatusBarTooltip();
        })
    );

    // 监听所有文件变更
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");

    watcher.onDidChange(uri => {
        vscode.window.showInformationMessage(`文件已修改: ${uri.fsPath}`);
    });

    watcher.onDidCreate(uri => {
        vscode.window.showInformationMessage(`文件已创建: ${uri.fsPath}`);
    });

    watcher.onDidDelete(uri => {
        vscode.window.showInformationMessage(`文件已删除: ${uri.fsPath}`);
    });

    // 注册监听器，避免插件被 GC 回收
    context.subscriptions.push(watcher);
}

/**
 * 插件停用时的回调函数
 */
export function deactivate() {
    console.log('VSCode MCP Server 插件已停用');
}