/**
 * ProxyConfigParser - Utility for parsing proxy configuration from environment variables
 */

import { ProxyRoute, ProxyAuth, ProxyConfig } from '../types';

export class ProxyConfigParser {
    /**
     * Parse proxy routes from environment variable string
     * Format: "name1:url1,name2:url2"
     * Example: "jsonplaceholder:https://jsonplaceholder.typicode.com,github:https://api.github.com"
     */
    static parseProxyRoutes(routesString: string): Record<string, ProxyRoute> {
        const routes: Record<string, ProxyRoute> = {};

        if (!routesString || routesString.trim() === '') {
            return routes;
        }

        const routePairs = routesString.split(',');

        for (const pair of routePairs) {
            const [name, targetUrl] = pair.split(':').map(s => s.trim());

            if (name && targetUrl) {
                // Validate URL format
                try {
                    new URL(targetUrl);
                    routes[name] = {
                        name,
                        targetUrl
                    };
                } catch (error) {
                    console.warn(`Invalid proxy route URL for '${name}': ${targetUrl}`);
                }
            }
        }

        return routes;
    }

    /**
     * Parse allowed domains from environment variable string
     * Format: "domain1.com,domain2.com,*.example.com"
     */
    static parseAllowedDomains(domainsString: string): string[] {
        if (!domainsString || domainsString.trim() === '') {
            return [];
        }

        return domainsString
            .split(',')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0);
    }

    /**
     * Parse blocked domains from environment variable string
     * Format: "malicious.com,spam.com"
     */
    static parseBlockedDomains(domainsString: string): string[] {
        return this.parseAllowedDomains(domainsString);
    }

    /**
     * Parse proxy authentication from environment variables
     * Looks for patterns like: PROXY_AUTH_<ROUTE_NAME>_TYPE, PROXY_AUTH_<ROUTE_NAME>_TOKEN, etc.
     */
    static parseProxyAuth(routeName: string, env: NodeJS.ProcessEnv): ProxyAuth | undefined {
        const prefix = `PROXY_AUTH_${routeName.toUpperCase()}_`;
        const authType = env[`${prefix}TYPE`] as ProxyAuth['type'];

        if (!authType) {
            return undefined;
        }

        const auth: ProxyAuth = { type: authType };

        switch (authType) {
            case 'bearer':
                const token = env[`${prefix}TOKEN`];
                if (token) {
                    auth.token = token;
                }
                break;

            case 'basic':
                const username = env[`${prefix}USERNAME`];
                const password = env[`${prefix}PASSWORD`];
                if (username && password) {
                    auth.username = username;
                    auth.password = password;
                }
                break;

            case 'apikey':
                auth.apiKeyHeader = env[`${prefix}HEADER`] || 'X-API-Key';
                const apiKeyValue = env[`${prefix}VALUE`];
                if (apiKeyValue) {
                    auth.apiKeyValue = apiKeyValue;
                }
                break;
        }

        return auth;
    }

    /**
     * Parse custom headers for a proxy route from environment variables
     * Looks for patterns like: PROXY_HEADERS_<ROUTE_NAME>="Header1:Value1,Header2:Value2"
     */
    static parseProxyHeaders(routeName: string, env: NodeJS.ProcessEnv): Record<string, string> | undefined {
        const headersString = env[`PROXY_HEADERS_${routeName.toUpperCase()}`];

        if (!headersString) {
            return undefined;
        }

        const headers: Record<string, string> = {};
        const headerPairs = headersString.split(',');

        for (const pair of headerPairs) {
            const [key, value] = pair.split(':').map(s => s.trim());
            if (key && value) {
                headers[key] = value;
            }
        }

        return Object.keys(headers).length > 0 ? headers : undefined;
    }

    /**
     * Parse path rewrite rules for a proxy route from environment variables
     * Looks for patterns like: PROXY_REWRITE_<ROUTE_NAME>="^/api/v1:/api/v2,^/old:/new"
     */
    static parsePathRewrite(routeName: string, env: NodeJS.ProcessEnv): Record<string, string> | undefined {
        const rewriteString = env[`PROXY_REWRITE_${routeName.toUpperCase()}`];

        if (!rewriteString) {
            return undefined;
        }

        const rewriteRules: Record<string, string> = {};
        const rulePairs = rewriteString.split(',');

        for (const pair of rulePairs) {
            const [pattern, replacement] = pair.split(':').map(s => s.trim());
            if (pattern && replacement !== undefined) {
                rewriteRules[pattern] = replacement;
            }
        }

        return Object.keys(rewriteRules).length > 0 ? rewriteRules : undefined;
    }

    /**
     * Parse cache configuration from environment variables
     */
    static parseCacheConfig(env: NodeJS.ProcessEnv): { enabled: boolean; defaultTTL: number; maxSize: number; routeTTLs?: Record<string, number> } | undefined {
        const cacheEnabled = env['PROXY_CACHE_ENABLED'] === 'true';

        if (!cacheEnabled) {
            return undefined;
        }

        const defaultTTL = parseInt(env['PROXY_CACHE_DEFAULT_TTL'] || '300000', 10); // 5 minutes default
        const maxSize = parseInt(env['PROXY_CACHE_MAX_SIZE'] || '100', 10);

        // Parse per-route TTLs
        // Format: PROXY_CACHE_TTL_<ROUTE_NAME>=60000
        const routeTTLs: Record<string, number> = {};
        const cachePrefix = 'PROXY_CACHE_TTL_';

        Object.keys(env).forEach(key => {
            if (key.startsWith(cachePrefix)) {
                const routeName = key.substring(cachePrefix.length).toLowerCase();
                const ttl = parseInt(env[key] || '0', 10);
                if (ttl > 0) {
                    routeTTLs[routeName] = ttl;
                }
            }
        });

        return {
            enabled: true,
            defaultTTL,
            maxSize,
            routeTTLs: Object.keys(routeTTLs).length > 0 ? routeTTLs : undefined
        };
    }

    /**
     * Build complete proxy configuration from environment variables
     */
    static buildProxyConfig(env: NodeJS.ProcessEnv): ProxyConfig {
        const enabled = env['PROXY_ENABLED'] !== 'false';
        const timeout = parseInt(env['PROXY_TIMEOUT'] || '5000', 10);
        const retries = parseInt(env['PROXY_RETRIES'] || '3', 10);

        // Parse basic routes
        const routes = this.parseProxyRoutes(env['PROXY_ROUTES'] || '');

        // Enhance routes with additional configuration
        Object.keys(routes).forEach(routeName => {
            const route = routes[routeName];
            if (!route) return;

            // Add authentication
            const auth = this.parseProxyAuth(routeName, env);
            if (auth) {
                route.auth = auth;
            }

            // Add custom headers
            const headers = this.parseProxyHeaders(routeName, env);
            if (headers) {
                route.headers = headers;
            }

            // Add path rewrite rules
            const pathRewrite = this.parsePathRewrite(routeName, env);
            if (pathRewrite) {
                route.pathRewrite = pathRewrite;
            }
        });

        // Parse cache configuration
        const cache = this.parseCacheConfig(env);

        return {
            enabled,
            routes,
            timeout,
            retries,
            allowedDomains: this.parseAllowedDomains(env['PROXY_ALLOWED_DOMAINS'] || ''),
            blockedDomains: this.parseBlockedDomains(env['PROXY_BLOCKED_DOMAINS'] || ''),
            cache
        };
    }

    /**
     * Validate proxy configuration
     */
    static validateProxyConfig(config: ProxyConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (config.timeout < 1000 || config.timeout > 60000) {
            errors.push('Timeout must be between 1000ms and 60000ms');
        }

        if (config.retries < 0 || config.retries > 10) {
            errors.push('Retries must be between 0 and 10');
        }

        // Validate routes
        Object.entries(config.routes).forEach(([name, route]) => {
            try {
                new URL(route.targetUrl);
            } catch {
                errors.push(`Invalid target URL for route '${name}': ${route.targetUrl}`);
            }

            // Validate authentication configuration
            if (route.auth) {
                const auth = route.auth;
                switch (auth.type) {
                    case 'bearer':
                        if (!auth.token) {
                            errors.push(`Bearer token missing for route '${name}'`);
                        }
                        break;
                    case 'basic':
                        if (!auth.username || !auth.password) {
                            errors.push(`Basic auth credentials missing for route '${name}'`);
                        }
                        break;
                    case 'apikey':
                        if (!auth.apiKeyHeader || !auth.apiKeyValue) {
                            errors.push(`API key configuration missing for route '${name}'`);
                        }
                        break;
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }
}