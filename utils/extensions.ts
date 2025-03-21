// 全局类型扩展
declare global {
    interface String {
        /**
         * 从字符串开头删除指定的字符
         */
        trimStart(): string;
    }
    
    interface Array<T> {
        /**
         * 获取数组的最后一个元素
         */
        last(): T | undefined;
    }
}

// 添加原型方法（如果不存在）
if (!String.prototype.trimStart) {
    String.prototype.trimStart = function() {
        return this.replace(/^[\s\uFEFF\xA0]+/g, '');
    };
}

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
}

export {};