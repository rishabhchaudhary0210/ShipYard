import { createServer } from "http";
import Express from 'express';
import morgan from 'morgan';
import { getAppConfig } from '../config/index.js';
import { setupWebSocketServer } from "../lib/web-socket.js";
import logger, { morganStream } from "../lib/logger.js";
import authRouter from './routes/auth.route.js';
import projectsRouter from './routes/projects.route.js';
import deploymentsRouter from './routes/deployments.route.js';

const app = Express();
const httpServer = createServer(app);
setupWebSocketServer(httpServer);

// Morgan HTTP request logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/deployments', deploymentsRouter);

// Error handling middleware
app.use((err: Error, _req: Express.Request, res: Express.Response, _next: Express.NextFunction) => {
    logger.error('Unhandled error in request', { error: err.message, stack: err.stack });
    res.status(500).json({ error: true, message: 'Internal server error' });
});

const port = getAppConfig('port');

httpServer.listen(port, () => {
    logger.info(`🚀 ShipYard API server started successfully`, { port });
}).on('error', (err: Error) => {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
});

