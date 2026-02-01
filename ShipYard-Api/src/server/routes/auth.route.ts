import { Router } from 'express';
import { signup, login, verifyTokenHandler } from '../controller/auth.controller.js';
import { validate } from '../middleware/validator.middleware.js';
import { signupSchema, loginSchema, verifyTokenSchema } from '../schema/auth.schema.js';

const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), signup);
authRouter.post('/login', validate(loginSchema), login);
authRouter.get('/verify-token', validate(verifyTokenSchema), verifyTokenHandler);

export default authRouter;
