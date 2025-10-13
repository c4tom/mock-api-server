/**
 * Authentication types and interfaces
 */

export interface AuthResult {
    valid: boolean;
    user?: UserInfo;
    error?: string;
}

export interface UserInfo {
    id: string;
    username?: string;
    email?: string;
    roles?: string[];
}

export interface AuthService {
    validateJWT(token: string): Promise<AuthResult>;
    validateBasicAuth(credentials: string): Promise<AuthResult>;
    validateDevToken(token: string): boolean;
    checkBypass(headers: Record<string, string>): boolean;
}

export interface JWTPayload {
    sub: string;
    username?: string;
    email?: string;
    roles?: string[];
    iat?: number;
    exp?: number;
}