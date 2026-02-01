import type { Request, Response } from 'express';
import dbClient from '../../db/client.js';
import logger from '../../lib/logger.js';
import { hashPassword, comparePassword } from '../../lib/bcrypt.js';
import { signToken, verifyToken } from '../../lib/jwt.js';

/**
 * Signup - Create a new user account
 */
export const signup = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await dbClient.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            logger.warn('Signup failed: Email already exists', { email });
            return res.status(400).json({
                error: true,
                message: 'Email already registered',
                data: null,
            });
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Create new user
        const user = await dbClient.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Generate JWT token
        const token = signToken({
            userId: user.id,
            email: user.email,
        });

        logger.info('User registered successfully', { userId: user.id, email: user.email });

        return res.status(201).json({
            error: false,
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        logger.error('Signup error', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            error: true,
            message: 'Failed to register user',
            data: null,
        });
    }
};

/**
 * Login - Authenticate user and return JWT token
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await dbClient.user.findUnique({
            where: { email },
        });

        if (!user) {
            logger.warn('Login failed: User not found', { email });
            return res.status(401).json({
                error: true,
                message: 'Invalid email or password',
                data: null,
            });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            logger.warn('Login failed: Invalid password', { email });
            return res.status(401).json({
                error: true,
                message: 'Invalid email or password',
                data: null,
            });
        }

        // Generate JWT token
        const token = signToken({
            userId: user.id,
            email: user.email,
        });

        logger.info('User logged in successfully', { userId: user.id, email: user.email });

        return res.status(200).json({
            error: false,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(500).json({
            error: true,
            message: 'Failed to login',
            data: null,
        });
    }
};

/**
 * Verify Token - Verify JWT token and return user information
 */
export const verifyTokenHandler = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: true,
                message: 'No token provided',
                data: null,
            });
        }

        const token = authHeader?.split(' ')?.[1] ?? ''; // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyToken(token);

        // Fetch user from database
        const user = await dbClient.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            logger.warn('Token verification failed: User not found', { userId: decoded.userId });
            return res.status(401).json({
                error: true,
                message: 'Invalid token',
                data: null,
            });
        }

        logger.info('Token verified successfully', { userId: user.id });

        return res.status(200).json({
            error: false,
            message: 'Token is valid',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        logger.error('Token verification error', { error: error instanceof Error ? error.message : 'Unknown error' });
        return res.status(401).json({
            error: true,
            message: 'Invalid or expired token',
            data: null,
        });
    }
};
