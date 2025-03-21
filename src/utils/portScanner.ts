import * as net from 'net';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('PortScanner');

/**
 * Scan for the first available port within a port range
 * @param start Starting port number
 * @param end Ending port number
 * @returns First available port or null
 */
export async function findAvailablePort(start: number, end: number): Promise<number | null> {
    // Validate port range
    if (start < 0 || start > 65535 || end < 0 || end > 65535 || start > end) {
        log.error(`Invalid port range: ${start}-${end}`);
        return null;
    }
    
    log.info(`Scanning for available port in range: ${start}-${end}`);
    
    for (let port = start; port <= end; port++) {
        try {
            if (await isPortAvailable(port)) {
                log.info(`Found available port: ${port}`);
                return port;
            }
        } catch (error) {
            log.error(`Error checking port ${port}:`, error);
            // Continue to check the next port
        }
    }
    
    log.warn(`No available ports found in range: ${start}-${end}`);
    return null;
}

/**
 * Check if a specific port is available
 * @param port Port to check
 * @returns Whether the port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void) => {
        const server = net.createServer();
        
        // Set timeout to prevent long blocking
        const timeout = setTimeout(() => {
            server.close();
            log.debug(`Port check timed out for port: ${port}`);
            resolve(false);
        }, 1000);
        
        server.once('error', () => {
            clearTimeout(timeout);
            log.debug(`Port ${port} is in use`);
            resolve(false);
        });
        
        server.once('listening', () => {
            clearTimeout(timeout);
            // Ensure server is closed before returning result
            server.close(() => {
                log.debug(`Port ${port} is available`);
                resolve(true);
            });
        });
        
        try {
            server.listen(port);
        } catch (error) {
            clearTimeout(timeout);
            log.error(`Error attempting to listen on port ${port}:`, error);
            resolve(false);
        }
    });
}