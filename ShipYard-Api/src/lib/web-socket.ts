import { WebSocketServer, WebSocket } from 'ws';
import { getContainerShell } from '../services/deployment/index.js';

export function setupWebSocketServer(httpServer: import("http").Server) {
    const wss = new WebSocketServer({ server: httpServer, path: '/container/shell' });

    wss.on('connection', async (ws, req) => {
        console.log('New client connected');

        const searchParams = new URLSearchParams(req.url?.split('?')?.[1] ?? '');
        const containerId = searchParams.get('containerId');

        if (!containerId) {
            ws.close(1008, 'containerId query parameter is required');
            return;
        }

        const { stream } = await getContainerShell(containerId);

        stream.on("data", (chunk: Buffer) => {
            ws.readyState === ws.OPEN && ws.send(chunk);
        });

        stream.on("error", (err: Error) => {
            console.error('Error in Docker stream:', err);
            ws.close(1011, 'Error in Docker stream');
        });

        stream.on("end", () => {
            console.log('Docker stream ended');
            ws.close();
        });

        // Client → Docker
        ws.on("message", (data: Buffer) => {
            stream.write(data);
        });

        ws.on("close", () => {
            stream.end();
        });

        ws.on("error", () => {
            stream.end();
        });
    });

    return wss;
}