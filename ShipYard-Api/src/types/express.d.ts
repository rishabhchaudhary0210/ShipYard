/**
 * User information attached to request after authentication
 */
export interface AuthUser {
    id: string;
    email: string;
}

/**
 * Extended Express Request type with user information
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
