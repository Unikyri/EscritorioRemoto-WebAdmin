import { authService } from './authService';

// Tipos para PC
export interface ClientPC {
	pcId: string;
	identifier: string;
	connectionStatus: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
	ownerUsername: string;
	ip: string;
	registeredAt: string;
	lastSeenAt: string | null;
	updatedAt: string;
}

export interface PCListResponse {
	success: boolean;
	data: ClientPC[];
	count: number;
	message?: string;
}

export interface PCServiceError {
	error: string;
	message: string;
	code: number;
}

class PCService {
	/**
	 * Obtener todos los PCs cliente
	 */
	async getAllClientPCs(): Promise<ClientPC[]> {
		try {
			const response = await authService.authenticatedFetch('/admin/pcs');
			
			if (!response.ok) {
				const error = await response.json() as PCServiceError;
				throw new Error(error.message || 'Error al obtener PCs cliente');
			}

			const data = await response.json() as PCListResponse;
			return data.data;
		} catch (error) {
			console.error('Error fetching client PCs:', error);
			throw error;
		}
	}

	/**
	 * Obtener solo los PCs cliente online
	 */
	async getOnlineClientPCs(): Promise<ClientPC[]> {
		try {
			const response = await authService.authenticatedFetch('/admin/pcs/online');
			
			if (!response.ok) {
				const error = await response.json() as PCServiceError;
				throw new Error(error.message || 'Error al obtener PCs online');
			}

			const data = await response.json() as PCListResponse;
			return data.data;
		} catch (error) {
			console.error('Error fetching online client PCs:', error);
			throw error;
		}
	}

	/**
	 * Formatear fecha para mostrar
	 */
	formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Obtener el estado de conexión en español
	 */
	getConnectionStatusText(status: ClientPC['connectionStatus']): string {
		switch (status) {
			case 'ONLINE':
				return 'En línea';
			case 'OFFLINE':
				return 'Desconectado';
			case 'CONNECTING':
				return 'Conectando';
			default:
				return 'Desconocido';
		}
	}

	/**
	 * Obtener la clase CSS para el estado de conexión
	 */
	getConnectionStatusClass(status: ClientPC['connectionStatus']): string {
		switch (status) {
			case 'ONLINE':
				return 'status-online';
			case 'OFFLINE':
				return 'status-offline';
			case 'CONNECTING':
				return 'status-connecting';
			default:
				return 'status-unknown';
		}
	}
}

export const pcService = new PCService(); 