import path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';

// 创建模块特定的日志记录器
const log = Logger.forModule('PathUtils');

// 缓存项目根目录以避免重复查询
let cachedProjectRoot: string | null = null;
let cachedProjectRootTimestamp = 0;
const CACHE_TTL = 10000; // 10秒缓存有效期

/**
 * 获取项目根目录
 * 如果可用，返回工作区根目录，否则返回当前文件目录
 * @returns 项目根路径或null
 */
export function getProjectRoot(): string | null {
  // 先检查缓存是否有效
  const now = Date.now();
  if (cachedProjectRoot && (now - cachedProjectRootTimestamp < CACHE_TTL)) {
    return cachedProjectRoot;
  }

  // 首先尝试获取工作区根目录
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const firstFolder = workspaceFolders[0];
    if (firstFolder) {
      log.info(`项目根目录来自工作区: ${firstFolder.uri.fsPath}`);
      cachedProjectRoot = firstFolder.uri.fsPath;
      cachedProjectRootTimestamp = now;
      return cachedProjectRoot;
    }
  }

  // 如果没有工作区，尝试使用当前打开文件的目录
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const filePath = activeEditor.document.uri.fsPath;
    const directory = path.dirname(filePath);
    log.info(`项目根目录来自活动文件: ${directory}`);
    cachedProjectRoot = directory;
    cachedProjectRootTimestamp = now;
    return cachedProjectRoot;
  }

  // 没有工作区也没有打开的文件
  log.warn('无法确定项目根目录: 没有工作区文件夹或活动文件');
  cachedProjectRoot = null;
  cachedProjectRootTimestamp = now;
  return null;
}

/**
 * 规范化路径并统一使用 / 作为分隔符
 * @param inputPath 输入路径
 * @returns 规范化的路径
 */
export function normalizePath(inputPath: string): string {
  // 安全检查
  if (inputPath === undefined || inputPath === null) return '/';

  // 转换所有反斜杠为正斜杠
  let normalizedPath = String(inputPath).replace(/\\/g, '/');

  // 使用 path.normalize 处理 ../ 和 ./ 情况，然后再次确保使用 /
  try {
    normalizedPath = path.normalize(normalizedPath).replace(/\\/g, '/');
  } catch (e) {
    log.error('路径规范化错误', e);
    return '/'; // 如果发生错误则返回根路径
  }

  // 确保不以 / 结尾（除非是根路径）
  if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  return normalizedPath;
}

/**
 * 检查路径是否安全且在项目内
 * 合并了原来的 isPathSafe 和 isPathWithinProject 函数
 * @param normalizedPath 已经规范化的路径
 * @param projectRoot 项目根目录（可选）
 * @returns 包含安全性和原因的对象
 */
export function isPathSafe(normalizedPath: string, projectRoot?: string | null): {
  safe: boolean;
  withinProject: boolean;
  reason?: string;
} {
  try {
    // 获取项目根目录（如果未提供）
    const root = projectRoot ?? getProjectRoot();
    
    // 检查路径是否包含可能导致目录遍历的模式
    const hasDirTraversal = normalizedPath.includes('../') || normalizedPath === '..';
    
    // 检查是否在项目目录内（如果有项目根目录）
    let withinProject = false;
    if (root && path.isAbsolute(normalizedPath)) {
      const normalizedRoot = path.normalize(root).replace(/\\/g, '/');
      withinProject = normalizedPath.startsWith(normalizedRoot);
    }

    if (hasDirTraversal) {
      return { 
        safe: false, 
        withinProject,
        reason: '路径包含目录遍历模式 (../)'
      };
    }

    return { 
      safe: true, 
      withinProject 
    };
  } catch (e) {
    log.error('路径安全检查错误', e);
    return { 
      safe: false, 
      withinProject: false,
      reason: `安全检查错误: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/**
 * 将路径转换为绝对路径
 * @param inputPath 输入路径
 * @returns 绝对路径或null
 */
export function toAbsolutePath(inputPath: string): string | null {
  try {
    // 规范化路径
    const normalizedPath = normalizePath(inputPath);
    
    // 获取项目根目录
    const projectRoot = getProjectRoot();
    if (!projectRoot) {
      log.warn('无法确定项目根目录');
      return null;
    }

    // 特殊处理根路径 "/"
    if (normalizedPath === '/') {
      return projectRoot;
    }

    // 处理以 / 开头的路径（相对于项目根目录）
    if (normalizedPath.startsWith('/')) {
      return path.join(projectRoot, normalizedPath.slice(1));
    }

    // 处理已经是绝对路径的情况
    if (path.isAbsolute(normalizedPath)) {
      return normalizedPath;
    }

    log.error(`toAbsolutePath 调试信息:`);
    log.error(`输入路径: ${inputPath}`);
    log.error(`规范化路径: ${normalizedPath}`);
    log.error(`项目根目录: ${projectRoot}`);

    // 处理普通相对路径（相对于项目根目录）
    return path.join(projectRoot, normalizedPath);
  } catch (e) {
    log.error('路径转换错误', e);
    return null;
  }
}

/**
 * 将绝对路径转换为相对于项目根目录的路径
 * @param absolutePath 绝对路径
 * @returns 相对路径或null
 */
export function toRelativePath(absolutePath: string): string | null {
  try {
    if (!absolutePath) {
      return null;
    }

    // 规范化绝对路径
    const normalizedAbsPath = path.normalize(absolutePath).replace(/\\/g, '/');
    
    // 获取项目根目录
    const rootDir = getProjectRoot();
    if (!rootDir) {
      // 无参考目录，返回规范化的绝对路径
      return normalizePath(absolutePath);
    }

    const normalizedRoot = path.normalize(rootDir).replace(/\\/g, '/');

    // 检查路径是否在项目目录内
    if (normalizedAbsPath.startsWith(normalizedRoot)) {
      // 计算相对路径
      let relativePath = path.relative(normalizedRoot, normalizedAbsPath).replace(/\\/g, '/');

      // 确保空相对路径返回 /
      if (!relativePath) {
        return '/';
      }

      return relativePath;
    } else {
      // 路径不在项目目录内，返回规范化的绝对路径
      return normalizePath(absolutePath);
    }
  } catch (e) {
    log.error('相对路径转换错误', e);
    return null;
  }
}

/**
 * 判断路径是否为绝对路径
 * @param inputPath 输入路径
 * @returns 是否为绝对路径
 */
export function isAbsolutePath(inputPath: string): boolean {
  try {
    return path.isAbsolute(inputPath);
  } catch (e) {
    log.error('路径类型检查错误', e);
    return false;
  }
}

/**
 * 连接多个路径片段为一个路径
 * @param paths 路径片段
 * @returns 连接后的路径
 */
export function joinPaths(...paths: string[]): string {
  try {
    // 过滤掉空路径
    const validPaths = paths.filter(p => p && p !== '');
    if (validPaths.length === 0) return '';

    // 连接路径并规范化
    return normalizePath(path.join(...validPaths));
  } catch (e) {
    log.error('路径连接错误', e);
    return '';
  }
}

/**
 * 获取目录名
 * @param inputPath 输入路径
 * @returns 目录名
 */
export function getDirName(inputPath: string): string {
  try {
    return path.dirname(inputPath);
  } catch (e) {
    log.error('获取目录名错误', e);
    return '';
  }
}

/**
 * 获取文件名
 * @param inputPath 输入路径
 * @returns 文件名
 */
export function getFileName(inputPath: string): string {
  try {
    return path.basename(inputPath);
  } catch (e) {
    log.error('获取文件名错误', e);
    return '';
  }
}
