import { authService } from './authService';
import { websocketService, type WebSocketEvent } from './websocketService';
import type {
	InitiateSessionRequest,
	InitiateSessionResponse,
	SessionStatusResponse,
	SessionSummary,
	ActiveSessionsResponse,
	UserSessionsResponse,
	RemoteSessionError,
	SessionWebSocketEvent
} from '$lib/types/session.types';

// Tipos para sesiones remotas

// Eventos WebSocket para sesiones

class RemoteSessionService {
	private apiUrl = 'http://localhost:8080/api/admin/sessions';

	/**
	 * Iniciar una nueva sesión de control remoto
	 */
	async initiateSession(clientPcId: string): Promise<InitiateSessionResponse> {
		try {
			const authHeaders = authService.getAuthHeader();
			
			const response = await fetch(`${this.apiUrl}/initiate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders
				},
				body: JSON.stringify({
					client_pc_id: clientPcId
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Error al iniciar sesión');
			}

			const result = await response.json();
			
			// Configurar listener para session_accepted si la sesión se inició correctamente
			if (result.success && result.session_id) {
				this.setupSessionAcceptedListener(result.session_id);
			}
			
			return result;
		} catch (error) {
			console.error('Error initiating session:', error);
			throw error;
		}
	}

	/**
	 * Configurar listener para cuando el cliente acepta la sesión
	 */
	private setupSessionAcceptedListener(sessionId: string): void {
		const handleSessionAccepted = (event: WebSocketEvent) => {
			const sessionData = event.data;
			
			// Verificar que es la sesión correcta
			if (sessionData.session_id === sessionId) {
				console.log('🎉 Session accepted, starting remote control in dashboard...');
				
				// Limpiar listener
				websocketService.unsubscribe('session_accepted', handleSessionAccepted);
				
				// Emitir evento personalizado para que el dashboard lo capture
				const customEvent = new CustomEvent('session-accepted', {
					detail: {
						sessionId: sessionId,
						clientPcId: sessionData.client_pc_id,
						status: sessionData.status,
						startTime: sessionData.start_time
					}
				});
				window.dispatchEvent(customEvent);
			}
		};

		// Suscribirse al evento
		websocketService.subscribe('session_accepted', handleSessionAccepted);
		
		// Auto-cleanup después de 5 minutos si no se acepta
		setTimeout(() => {
			websocketService.unsubscribe('session_accepted', handleSessionAccepted);
		}, 5 * 60 * 1000);
	}

	/**
	 * Configurar listener para screen frames (para usar en el dashboard)
	 */
	setupScreenFrameListener(callback: (frame: any) => void): () => void {
		const handleScreenFrame = (event: WebSocketEvent) => {
			if (event.type === 'screen_frame') {
				callback(event.data);
			}
		};

		websocketService.subscribe('screen_frame', handleScreenFrame);

		// Retornar función para limpiar el listener
		return () => {
			websocketService.unsubscribe('screen_frame', handleScreenFrame);
		};
	}

	/**
	 * Obtener el estado de una sesión específica
	 */
	async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
		try {
			const response = await authService.authenticatedFetch(`/admin/sessions/${sessionId}/status`);

			if (!response.ok) {
				const error = await response.json() as RemoteSessionError;
				throw new Error(error.message || 'Error al obtener estado de sesión');
			}

			const data = await response.json() as SessionStatusResponse;
			return data;
		} catch (error) {
			console.error('Error fetching session status:', error);
			throw error;
		}
	}

	/**
	 * Obtener todas las sesiones activas
	 */
	async getActiveSessions(): Promise<SessionSummary[]> {
		try {
			const response = await authService.authenticatedFetch('/admin/sessions/active');

			if (!response.ok) {
				const error = await response.json() as RemoteSessionError;
				throw new Error(error.message || 'Error al obtener sesiones activas');
			}

			const data = await response.json() as ActiveSessionsResponse;
			// Asegurar que siempre retornemos un array, incluso si el backend retorna null
			return Array.isArray(data.sessions) ? data.sessions : [];
		} catch (error) {
			console.error('Error fetching active sessions:', error);
			throw error;
		}
	}

	/**
	 * Obtener las sesiones del usuario actual
	 */
	async getUserSessions(): Promise<SessionSummary[]> {
		try {
			const response = await authService.authenticatedFetch('/admin/sessions/my');

			if (!response.ok) {
				const error = await response.json() as RemoteSessionError;
				throw new Error(error.message || 'Error al obtener sesiones del usuario');
			}

			const data = await response.json() as UserSessionsResponse;
			// Asegurar que siempre retornemos un array, incluso si el backend retorna null
			return Array.isArray(data.sessions) ? data.sessions : [];
		} catch (error) {
			console.error('Error fetching user sessions:', error);
			throw error;
		}
	}

	/**
	 * Formatear estado de sesión para mostrar
	 */
	getSessionStatusText(status: string): string {
		switch (status) {
			case 'PENDING_APPROVAL':
				return 'Esperando aprobación';
			case 'ACTIVE':
				return 'Activa';
			case 'ENDED_SUCCESSFULLY':
				return 'Finalizada';
			case 'ENDED_BY_ADMIN':
				return 'Finalizada por admin';
			case 'ENDED_BY_CLIENT':
				return 'Finalizada por cliente';
			case 'REJECTED':
				return 'Rechazada';
			case 'FAILED':
				return 'Fallida';
			default:
				return 'Desconocido';
		}
	}

	/**
	 * Obtener la clase CSS para el estado de sesión
	 */
	getSessionStatusClass(status: string): string {
		switch (status) {
			case 'PENDING_APPROVAL':
				return 'status-pending';
			case 'ACTIVE':
				return 'status-active';
			case 'ENDED_SUCCESSFULLY':
			case 'ENDED_BY_ADMIN':
			case 'ENDED_BY_CLIENT':
				return 'status-ended';
			case 'REJECTED':
			case 'FAILED':
				return 'status-failed';
			default:
				return 'status-unknown';
		}
	}

	/**
	 * Verificar si una sesión está en progreso
	 */
	isSessionInProgress(status: string): boolean {
		return status === 'PENDING_APPROVAL' || status === 'ACTIVE';
	}

	/**
	 * Verificar si una sesión está activa
	 */
	isSessionActive(status: string): boolean {
		return status === 'ACTIVE';
	}

	/**
	 * Finalizar una sesión por parte del administrador
	 */
	async endSession(sessionId: string): Promise<void> {
		try {
			const response = await authService.authenticatedFetch(`/admin/sessions/${sessionId}/end`, {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json() as RemoteSessionError;
				throw new Error(error.message || 'Error al finalizar sesión');
			}

			console.log('✅ Session ended successfully:', sessionId);
		} catch (error) {
			console.error('Error ending session:', error);
			throw error;
		}
	}
}

export const remoteSessionService = new RemoteSessionService(); 