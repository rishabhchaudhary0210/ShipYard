import { WebSocketServer, WebSocket } from 'ws';
import logger from './logger.js';
import { getContainerShell } from '../services/deployment/index.js';

export function setupWebSocketServer(httpServer: import("http").Server) {
    const wss = new WebSocketServer({ server: httpServer, path: '/container/shell' });

    wss.on('connection', async (ws, req) => {
        const searchParams = new URLSearchParams(req.url?.split('?')?.[1] ?? '');
        const containerId = searchParams.get('containerId');

        logger.info('WebSocket client connected', { containerId, ip: req.socket.remoteAddress });

        if (!containerId) {
            logger.warn('WebSocket connection rejected: missing containerId');
            ws.close(1008, 'containerId query parameter is required');
            return;
        }

        try {
            const { stream } = await getContainerShell(containerId);

            stream.on("data", (chunk: Buffer) => {
                ws.readyState === ws.OPEN && ws.send(chunk);
            });

            stream.on("error", (err: Error) => {
                logger.error('Error in Docker stream', { containerId, error: err.message });
                ws.close(1011, 'Error in Docker stream');
            });

            stream.on("end", () => {
                logger.debug('Docker stream ended', { containerId });
                ws.close();
            });

            // Client → Docker
            ws.on("message", (data: Buffer) => {
                stream.write(data);
            });

            ws.on("close", () => {
                logger.info('WebSocket client disconnected', { containerId });
                stream.end();
            });

            ws.on("error", (err: Error) => {
                logger.error('WebSocket error', { containerId, error: err.message });
                stream.end();
            });
        } catch (error) {
            logger.error('Failed to setup container shell', { 
                containerId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
            ws.close(1011, 'Failed to setup container shell');
        }
    });

    logger.info('WebSocket server initialized', { path: '/container/shell' });

    return wss;
}