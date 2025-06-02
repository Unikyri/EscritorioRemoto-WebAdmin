import { authService } from './authService';

export interface WebSocketEvent {
	type: string;
	timestamp: string;
	data: any;
}

export interface PCConnectionEvent {
	type: 'pc_connected' | 'pc_disconnected' | 'pc_status_changed' | 'pc_registered' | 'pc_list_update';
	pcId: string;
	identifier?: string;
	ownerUserId?: string;
	ip?: string;
	status?: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
	oldStatus?: string;
	newStatus?: string;
	timestamp?: number;
	event?: string;
}

class WebSocketService {
	private ws: WebSocket | null = null;
	private eventHandlers: Map<string, ((event: WebSocketEvent) => void)[]> = new Map();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // 1 second
	private wsUrl = 'ws://localhost:8080/ws/admin';

	/**
	 * Conectar al WebSocket del servidor
	 */
	connect(): void {
		try {
			// Obtener token para autenticación
			const authHeaders = authService.getAuthHeader();
			if (!('Authorization' in authHeaders)) {
				console.warn('No hay token de autenticación para WebSocket');
				return;
			}

			// Extraer token de Bearer
			const token = (authHeaders as { Authorization: string }).Authorization.replace('Bearer ', '');
			
			// Crear URL con token como query parameter
			const wsUrlWithToken = `${this.wsUrl}?token=${encodeURIComponent(token)}`;

			// Crear conexión WebSocket
			this.ws = new WebSocket(wsUrlWithToken);

			this.ws.onopen = () => {
				console.log('WebSocket conectado');
				this.reconnectAttempts = 0;
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketEvent = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			this.ws.onclose = (event) => {
				console.log('WebSocket desconectado:', event.code, event.reason);
				this.ws = null;
				this.attemptReconnect();
			};

			this.ws.onerror = (error) => {
				console.error('Error de WebSocket:', error);
			};

		} catch (error) {
			console.error('Error al conectar WebSocket:', error);
		}
	}

	/**
	 * Desconectar WebSocket
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Enviar mensaje al servidor
	 */
	private send(message: any): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	/**
	 * Manejar mensajes recibidos
	 */
	private handleMessage(message: WebSocketEvent): void {
		console.log('WebSocket message received:', message);
		
		const handlers = this.eventHandlers.get(message.type) || [];
		handlers.forEach(handler => {
			try {
				handler(message);
			} catch (error) {
				console.error('Error in WebSocket event handler:', error);
			}
		});

		// También notificar a handlers genéricos
		const allHandlers = this.eventHandlers.get('*') || [];
		allHandlers.forEach(handler => {
			try {
				handler(message);
			} catch (error) {
				console.error('Error in generic WebSocket event handler:', error);
			}
		});
	}

	/**
	 * Intentar reconectar automáticamente
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(`Intentando reconectar WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
			
			setTimeout(() => {
				this.connect();
			}, this.reconnectDelay * this.reconnectAttempts);
		} else {
			console.error('Se agotaron los intentos de reconexión WebSocket');
		}
	}

	/**
	 * Suscribirse a eventos específicos
	 */
	subscribe(eventType: string, handler: (event: WebSocketEvent) => void): void {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, []);
		}
		this.eventHandlers.get(eventType)!.push(handler);
	}

	/**
	 * Desuscribirse de eventos
	 */
	unsubscribe(eventType: string, handler: (event: WebSocketEvent) => void): void {
		const handlers = this.eventHandlers.get(eventType);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	/**
	 * Verificar si WebSocket está conectado
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}
}

export const websocketService = new WebSocketService(); 