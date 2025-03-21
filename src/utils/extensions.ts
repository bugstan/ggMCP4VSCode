import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('Extensions');

// Global type extensions
declare global {
    interface String {
        /**
         * Remove specified characters from the beginning of the string
         */
        trimStart(): string;
    }
    
    interface Array<T> {
        /**
         * Get the last element of the array
         */
        last(): T | undefined;
    }
}

// Add prototype methods (if they don't exist)
if (!String.prototype.trimStart) {
    log.debug('Adding String.prototype.trimStart extension method');
    String.prototype.trimStart = function() {
        return this.replace(/^[\s\uFEFF\xA0]+/g, '');
    };
}

if (!Array.prototype.last) {
    log.debug('Adding Array.prototype.last extension method');
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
}

export {};