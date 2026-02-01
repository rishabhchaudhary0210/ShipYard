import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../lib/jwt.js';
import logger from '../../lib/logger.js';

/**
 * Authentication middleware
 * Validates JWT token from Authorization header and attaches user info to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Authentication failed: No token provided');
            return res.status(401).json({
                error: true,
                message: 'Authentication required. Please provide a valid token.',
                data: null,
            });
        }

        // Extract token (remove 'Bearer ' prefix)
        const token = authHeader?.split(' ')?.[1] ?? '';

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            logger.warn('Authentication failed: Invalid token payload');
            return res.status(401).json({
                error: true,
                message: 'Invalid token. Please login again.',
                data: null,
            });
        }

        // Attach user info to request object
        req.user = {
            id: decoded.userId,
            email: decoded.email,
        };

        logger.debug('User authenticated successfully', { userId: decoded.userId });

        next();
    } catch (error) {
        logger.warn('Authentication failed: Invalid or expired token', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(401).json({
            error: true,
            message: 'Invalid or expired token. Please login again.',
            data: null,
        });
    }
};
