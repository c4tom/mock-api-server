/**
 * Middleware types and interfaces
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username?: string;
        email?: string;
        roles?: string[];
    };
    startTime?: number;
    requestId?: string;
}

export interface SuspiciousActivityResult {
    isSuspicious: boolean;
    reason?: string;
    riskLevel: 'low' | 'medium' | 'high';
    shouldBlock: boolean;
}

export interface SecurityMiddleware {
    authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    validateOrigin(req: Request, res: Response, next: NextFunction): void;
    applyRateLimit(req: Request, res: Response, next: NextFunction): void;
    detectSuspiciousActivity(req: Request): SuspiciousActivityResult;
}