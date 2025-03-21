import { Response } from '../types';

/**
 * 创建成功响应
 * @param data 成功数据（任意类型）
 */
export function successResponse(data: any): Response {
    // 如果数据不是字符串，则将其转换为JSON字符串
    const status = typeof data === 'string' ? data : JSON.stringify(data);
    return {
        status,
        error: null
    };
}

/**
 * 创建错误响应
 * @param message 错误消息
 */
export function errorResponse(message: string): Response {
    return {
        status: null,
        error: message
    };
}

/**
 * 格式化错误信息
 * @param error 错误对象或字符串
 */
export function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}