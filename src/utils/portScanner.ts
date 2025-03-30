import net from 'net';
import { Logger } from './logger';

// Create module-specific logger
const log = Logger.forModule('PortScanner');

/**
 * Port scan configuration options
 */
export interface PortScanOptions {
    /** Timeout in milliseconds */
    timeout?: number;
    /** Number of ports to check concurrently */
    concurrency?: number;
    /** List of ports to exclude */
    exclude?: number[];
    /** Whether to randomize port selection (instead of sequential) */
    randomize?: boolean;
    /** Number of retries (to increase reliability) */
    retries?: number;
    /** List of preferred ports */
    preferredPorts?: number[];
    /** Whether to check from high to low ports */
    fromHighToLow?: boolean;
}

/**
 * Node.js network error interface
 */
interface NodeJSNetworkError extends Error {
    code?: string;
}

// Shared cache: stores known available/unavailable ports
const portStatusCache: Map<number, { available: boolean; timestamp: number }> = new Map();
// Cache validity period (milliseconds)
const CACHE_TTL = 30000; // 30 seconds

/**
 * Check port status in cache
 * @param port Port number
 * @returns Cached status or null
 */
function getCachedPortStatus(port: number): boolean | null {
    const cached = portStatusCache.get(port);
    if (!cached) return null;

    // Check if cache has expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        portStatusCache.delete(port);
        return null;
    }

    return cached.available;
}

/**
 * Cache port status
 * @param port Port number
 * @param available Whether the port is available
 */
function cachePortStatus(port: number, available: boolean): void {
    portStatusCache.set(port, {
        available,
        timestamp: Date.now(),
    });
}

/**
 * Scan and find the first available port
 * @param start Starting port number
 * @param end Ending port number
 * @param options Scan options
 * @returns First available port or null
 */
export async function findAvailablePort(
    start: number,
    end: number,
    options: PortScanOptions = {}
): Promise<number | null> {
    // Verify port range
    if (start < 0 || start > 65535 || end < 0 || end > 65535 || start > end) {
        log.error(`Invalid port range: ${start}-${end}`);
        return null;
    }

    const {
        timeout = 400,
        concurrency = 8,
        exclude = [],
        randomize = false,
        retries = 1,
        fromHighToLow = false,
    } = options;

    const startTime = Date.now();
    log.info(`Scanning for available port in range: ${start}-${end}, concurrency: ${concurrency}`);

    // Create ports to check list
    let ports = Array.from({ length: end - start + 1 }, (_, i) => start + i).filter(
        (port) => !exclude.includes(port)
    );

    // First check cached available ports
    for (const port of ports) {
        const cached = getCachedPortStatus(port);
        if (cached === true) {
            // Confirm availability again, as cache may be outdated
            if (await isPortAvailable(port, timeout)) {
                log.info(`Found available port (from cache): ${port}`);
                return port;
            } else {
                // Update cache
                cachePortStatus(port, false);
            }
        }
    }

    // Filter out known unavailable ports
    ports = ports.filter((port) => {
        const cached = getCachedPortStatus(port);
        return cached !== false;
    });

    // Process ports based on options
    if (fromHighToLow) {
        ports.reverse();
    }

    if (randomize) {
        ports = shuffleArray(ports);
    }

    // Batch parallel check ports
    for (let i = 0; i < ports.length; i += concurrency) {
        const batch = ports.slice(i, i + concurrency);

        try {
            // Parallel check multiple ports
            const portCheckPromises = batch.map((port) =>
                checkPortWithRetries(port, timeout, retries)
            );
            const results = await Promise.all(portCheckPromises);

            // Find first available port
            const availablePortIndex = results.findIndex((available) => available);
            if (availablePortIndex !== -1) {
                const port = batch[availablePortIndex];
                if (port !== undefined) {
                    // Cache result
                    cachePortStatus(port, true);

                    const duration = Date.now() - startTime;
                    log.info(`Found available port: ${port} (took ${duration}ms)`);
                    return port;
                }
            }

            // Cache unavailable ports
            batch.forEach((port, index) => {
                if (!results[index]) {
                    cachePortStatus(port, false);
                }
            });
        } catch (error) {
            log.error(`Error checking port batch:`, error);
            // Continue checking next batch of ports
        }
    }

    const duration = Date.now() - startTime;
    log.warn(`No available ports found in range: ${start}-${end} (took ${duration}ms)`);
    return null;
}

/**
 * Use retry mechanism to check port availability
 * @param port Port to check
 * @param timeout Timeout time
 * @param retries Number of retries
 * @returns Whether the port is available
 */
async function checkPortWithRetries(
    port: number,
    timeout: number,
    retries: number
): Promise<boolean> {
    // First check cache
    const cached = getCachedPortStatus(port);
    if (cached !== null) return cached;

    // Multiple attempts to increase reliability
    for (let i = 0; i <= retries; i++) {
        try {
            if (await isPortAvailable(port, timeout)) {
                return true;
            }

            // If not available and there are retries left, wait briefly before retrying
            if (i < retries) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
        } catch (error) {
            if (i === retries) {
                log.info(`Port ${port} check error after ${retries} retries:`, error);
            }
        }
    }

    return false;
}

/**
 * Check whether the specified port is available
 * @param port Port to check
 * @param timeout Timeout time (milliseconds)
 * @returns Whether the port is available
 */
function isPortAvailable(port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve: (value: boolean) => void) => {
        // Create a server instance to try binding the port
        const server = net.createServer();
        let resolved = false;

        // Set timeout handling
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                server.close();
                log.info(`Port check timed out for port: ${port}`);
                resolve(false);
            }
        }, timeout);

        // Error handling - usually indicates port unavailable
        server.once('error', (err: NodeJSNetworkError) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);

                // EADDRINUSE indicates port in use
                // EACCES indicates no permission to access port
                // EADDRNOTAVAIL indicates address unavailable
                const errorCodes = ['EADDRINUSE', 'EACCES', 'EADDRNOTAVAIL'];
                const inUse = errorCodes.includes(err.code || '');
                log.info(`Port ${port} is ${inUse ? 'in use' : 'unavailable'}: ${err.code}`);
                resolve(false);
            }
        });

        // Listen success indicates port available
        server.once('listening', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);

                // Ensure server is closed before returning result
                server.close(() => {
                    log.info(`Port ${port} is available`);
                    resolve(true);
                });
            }
        });

        // Try listening to port
        try {
            server.listen(port);
        } catch (error) {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                log.error(`Error attempting to listen on port ${port}:`, error);
                resolve(false);
            }
        }
    });
}

/**
 * Randomly shuffle array elements (Fisher-Yates shuffle algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
    // Create array copy to avoid modifying original array
    const result = [...array];

    // Start from end, swap with random position
    for (let i = result.length - 1; i > 0; i--) {
        // Generate random index between 0 and i
        const j = Math.floor(Math.random() * (i + 1));

        // Swap elements
        const temp = result[i];
        result[i] = result[j]!;
        result[j] = temp!;
    }

    return result;
}

/**
 * Check common known ports, try to find available high probability ports
 * @param options Scan options
 * @returns First available port or null
 */
export async function findPreferredPort(options: PortScanOptions = {}): Promise<number | null> {
    const preferredPorts = options.preferredPorts || [3000, 8080, 8000, 5000, 4000, 9000];

    log.info(`Checking preferred ports first: ${preferredPorts.join(', ')}`);

    // First optimization: Use Promise.all to parallel check all preferred ports
    try {
        const results = await Promise.all(
            preferredPorts.map(async (port) => {
                try {
                    const available = await checkPortWithRetries(
                        port,
                        options.timeout || 400,
                        options.retries || 1
                    );
                    return { port, available };
                } catch {
                    return { port, available: false };
                }
            })
        );

        // Find first available port
        const firstAvailable = results.find((r) => r.available);
        if (firstAvailable) {
            log.info(`Found available preferred port: ${firstAvailable.port}`);
            return firstAvailable.port;
        }
    } catch (error) {
        log.warn('Error checking preferred ports:', error);
    }

    // If no available preferred ports, try random range
    const randomStart = 10000 + Math.floor(Math.random() * 40000);
    const randomEnd = randomStart + 1000;
    log.info(`No preferred ports available, checking random range: ${randomStart}-${randomEnd}`);

    return findAvailablePort(randomStart, randomEnd, {
        ...options,
        randomize: true,
        concurrency: 10, // Use higher concurrency for random range
    });
}

/**
 * Check whether the port is in use
 * @param port Port to check
 * @param timeout Timeout time
 * @returns Whether the port is in use
 */
export async function isPortInUse(port: number, timeout = 400): Promise<boolean> {
    return !(await isPortAvailable(port, timeout));
}

/**
 * Quickly check the status of common ports usually used in the system
 * @param options Scan options
 * @returns Port status mapping
 */
export async function getCommonPortsStatus(
    options: PortScanOptions = {}
): Promise<Record<string, boolean>> {
    const commonPorts: Record<string, number> = {
        HTTP: 80,
        HTTPS: 443,
        SSH: 22,
        FTP: 21,
        SMTP: 25,
        POP3: 110,
        IMAP: 143,
        MySQL: 3306,
        PostgreSQL: 5432,
        MongoDB: 27017,
        Redis: 6379,
        Elasticsearch: 9200,
        'Node Default': 3000,
        'React Default': 5173,
        'Angular Default': 4200,
        'Django Default': 8000,
        'Flask Default': 5000,
    };

    const startTime = Date.now();
    log.info(`Checking status of ${Object.keys(commonPorts).length} common ports`);

    const statuses: Record<string, boolean> = {};
    const timeout = options.timeout || 200; // Quick check, use shorter timeout

    // Batch processing to reduce system pressure
    const batchSize = 5;
    const portEntries = Object.entries(commonPorts);

    for (let i = 0; i < portEntries.length; i += batchSize) {
        const batch = portEntries.slice(i, i + batchSize);

        // Parallel check current batch ports
        const results = await Promise.allSettled(
            batch.map(async ([name, port]) => {
                const available = await isPortAvailable(port, timeout);
                return { name, port, available };
            })
        );

        // Process results
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { name, port, available } = result.value;
                statuses[`${name} (${port})`] = available;

                // Update cache
                cachePortStatus(port, available);
            }
        });
    }

    const duration = Date.now() - startTime;
    log.info(`Completed common ports status check in ${duration}ms`);
    return statuses;
}

/**
 * Find multiple available ports in specified range
 * @param count Number of ports needed
 * @param start Starting port
 * @param end Ending port
 * @param options Scan options
 * @returns Available ports list
 */
export async function findMultipleAvailablePorts(
    count: number,
    start = 8000,
    end = 9000,
    options: PortScanOptions = {}
): Promise<number[]> {
    if (count <= 0) return [];
    if (count === 1) {
        const port = await findAvailablePort(start, end, options);
        return port ? [port] : [];
    }

    const availablePorts: number[] = [];
    const exclude = [...(options.exclude || [])];

    // Loop to find multiple ports
    for (let i = 0; i < count; i++) {
        const port = await findAvailablePort(start, end, {
            ...options,
            exclude: exclude, // Exclude already found ports
        });

        if (port) {
            availablePorts.push(port);
            exclude.push(port); // Add found port to exclude list
        } else {
            log.warn(`Could only find ${availablePorts.length} of ${count} requested ports`);
            break;
        }
    }

    return availablePorts;
}

/**
 * Clear port status cache
 */
export function clearPortCache(): void {
    portStatusCache.clear();
    log.info('Port status cache cleared');
}
