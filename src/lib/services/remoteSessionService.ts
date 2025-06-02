import { authService } from './authService';

// Tipos para sesiones remotas
export interface InitiateSessionRequest {
	client_pc_id: string;
}

export interface InitiateSessionResponse {
	success: boolean;
	session_id: string;
	status: string;
	message: string;
}

export interface SessionStatusResponse {
	session_id: string;
	admin_user_id: string;
	client_pc_id: string;
	status: string;
	start_time?: string | null;
	end_time?: string | null;
	duration?: number | null;
	created_at: string;
	updated_at: string;
}

export interface SessionSummary {
	session_id: string;
	admin_user_id: string;
	client_pc_id: string;
	status: string;
	start_time?: string | null;
	end_time?: string | null;
	created_at: string;
}

export interface ActiveSessionsResponse {
	sessions: SessionSummary[];
	count: number;
}

export interface UserSessionsResponse {
	sessions: SessionSummary[];
	count: number;
}

export interface RemoteSessionError {
	error: string;
	message: string;
	details?: string;
}

// Eventos WebSocket para sesiones
export interface SessionWebSocketEvent {
	type: 'session_started' | 'session_rejected' | 'session_ended' | 'session_failed';
	session_id: string;
	admin_user_id: string;
	client_pc_id: string;
	start_time?: string;
	end_time?: string;
	end_reason?: string;
	duration?: string;
	error?: string;
	reason?: string;
}

class RemoteSessionService {
	/**
	 * Iniciar una nueva sesión de control remoto
	 */
	async initiateSession(clientPCID: string): Promise<InitiateSessionResponse> {
		try {
			const response = await authService.authenticatedFetch('/admin/sessions/initiate', {
				method: 'POST',
				body: JSON.stringify({ 
					client_pc_id: clientPCID 
				} as InitiateSessionRequest),
			});

			if (!response.ok) {
				const error = await response.json() as RemoteSessionError;
				throw new Error(error.message || 'Error al iniciar sesión remota');
			}

			const data = await response.json() as InitiateSessionResponse;
			return data;
		} catch (error) {
			console.error('Error initiating remote session:', error);
			throw error;
		}
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
			return data.sessions;
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
			return data.sessions;
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
}

export const remoteSessionService = new RemoteSessionService(); 