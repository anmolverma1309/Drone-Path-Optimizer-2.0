import { useState, useEffect, useCallback } from 'react';
import { TelemetryState } from './types';

/**
 * Custom hook to handle real-time WebSocket connection to the drone backend.
 */
export const useDroneSocket = (url: string) => {
    const [droneState, setDroneState] = useState<TelemetryState | null>(null);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('Telemetry connection established');
        };

        ws.onmessage = (event) => {
            const data: TelemetryState = JSON.parse(event.data);
            setDroneState(data);
        };

        ws.onclose = () => {
            console.log('Telemetry connection closed');
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [url]);

    const sendCommand = useCallback((command: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(command));
        }
    }, [socket]);

    return { droneState, sendCommand };
};

export default useDroneSocket;
