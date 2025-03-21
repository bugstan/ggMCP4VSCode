import * as path from 'path';
import { getProjectRoot, getCurrentDirectory } from './project';

/**
 * 规范化路径并统一使用 / 作为分隔符
 * @param inputPath 输入路径
 * @returns 规范化后的路径
 */
export function normalizePath(inputPath: string): string {
    // 安全检查
    if (inputPath === undefined || inputPath === null) return '/';
    
    // 将所有反斜杠转换为正斜杠
    let normalizedPath = String(inputPath).replace(/\\/g, '/');
    
    // 使用 path.normalize 处理 ../ 和 ./ 等情况，然后再次确保使用 /
    try {
        normalizedPath = path.normalize(normalizedPath).replace(/\\/g, '/');
    } catch (e) {
        console.error('路径规范化错误:', e);
        return '/'; // 发生错误时返回根路径
    }
    
    // 确保不以 / 结尾（除非是根路径）
    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
        normalizedPath = normalizedPath.slice(0, -1);
    }
    
    return normalizedPath;
}

/**
 * 检查路径是否安全（不包含路径遍历）
 * @param inputPath 输入路径
 * @returns 是否安全
 */
export function isPathSafe(inputPath: string): boolean {
    try {
        const normalizedPath = normalizePath(inputPath);
        // 检查路径是否包含 "../" 或等于 ".." (这可能导致目录遍历)
        return !(normalizedPath.includes('../') || normalizedPath === '..');
    } catch (e) {
        console.error('路径安全检查错误:', e);
        return false; // 发生错误时认为路径不安全
    }
}

/**
 * 检查路径是否有效，可以处理以下情况：
 * 1. 绝对路径
 * 2. 相对于项目根目录或当前目录的路径
 * @param filePath 要检查的路径
 * @returns 有效的绝对路径或null
 */
export function resolveFilePath(filePath: string): string | null {
    try {
        // 空路径检查
        if (!filePath) return null;
        
        // 如果是绝对路径，直接返回
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        
        // 尝试使用项目根目录解析
        const rootPath = getProjectRoot();
        if (rootPath) {
            return path.join(rootPath, filePath);
        }
        
        // 尝试使用当前目录解析
        const currentDir = getCurrentDirectory();
        if (currentDir) {
            return path.join(currentDir, filePath);
        }
        
        return null;
    } catch (e) {
        console.error('路径解析错误:', e);
        return null;
    }
}

/**
 * 将项目相对路径转换为绝对路径，并进行安全检查
 * @param pathInProject 项目内相对路径
 * @returns 绝对路径或null（如果不安全或找不到项目根目录）
 */
export function toAbsolutePathSafe(pathInProject: string): string | null {
    try {
        console.log(`尝试解析路径: ${pathInProject}`);
        
        // 规范化路径
        const normalizedPath = normalizePath(pathInProject);
        console.log(`规范化后路径: ${normalizedPath}`);
        
        // 安全检查
        if (!isPathSafe(normalizedPath)) {
            console.log(`路径不安全: ${normalizedPath}`);
            return null;
        }
        
        // 处理根路径 "/"
        if (normalizedPath === '/') {
            // 获取当前目录
            const dir = getCurrentDirectory();
            console.log(`根路径"/"映射到: ${dir}`);
            return dir;
        }
        
        // 尝试解析路径
        const resolvedPath = resolveFilePath(normalizedPath);
        console.log(`最终解析路径: ${resolvedPath}`);
        return resolvedPath;
    } catch (e) {
        console.error('绝对路径解析错误:', e);
        return null;
    }
}

/**
 * 将绝对路径转换为项目相对路径
 * @param absolutePath 绝对路径
 * @returns 相对路径或null
 */
export function toRelativePath(absolutePath: string): string | null {
    try {
        if (!absolutePath) return null;
        
        // 获取项目根目录或当前目录
        const rootDir = getProjectRoot() || getCurrentDirectory();
        if (!rootDir) {
            // 没有基准目录，返回绝对路径（规范化后）
            return normalizePath(absolutePath);
        }
        
        // 规范化路径
        const normalizedAbsPath = path.normalize(absolutePath);
        const normalizedRoot = path.normalize(rootDir);
        
        // 检查路径是否在基准目录内
        if (normalizedAbsPath.startsWith(normalizedRoot)) {
            // 计算相对路径
            let relativePath = path.relative(normalizedRoot, normalizedAbsPath).replace(/\\/g, '/');
            
            // 确保根目录返回 /
            if (!relativePath) {
                return '/';
            }
            
            return relativePath;
        } else {
            // 路径不在基准目录内，返回绝对路径（规范化后）
            return normalizePath(absolutePath);
        }
    } catch (e) {
        console.error('相对路径转换错误:', e);
        return null;
    }
}