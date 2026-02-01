import jwt from 'jsonwebtoken';
import { getAppConfig } from '../config/index.js';

export interface JwtPayload {
    userId: string;
    email: string;
}

/**
 * Sign a JWT token with the provided payload
 */
export const signToken = (payload: JwtPayload): string => {
    const secret = getAppConfig('jwtSecret') as string;
    const expiresIn = getAppConfig('jwtExpiry') as string;
    
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
    const secret = getAppConfig('jwtSecret') as string;
    
    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

/**
 * Decode a JWT token without verifying (for inspection purposes only)
 */
export const decodeToken = (token: string): JwtPayload | null => {
    try {
        const decoded = jwt.decode(token) as JwtPayload;
        return decoded;
    } catch (error) {
        return null;
    }
};
