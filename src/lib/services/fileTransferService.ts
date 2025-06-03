import { authService } from './authService';

export interface FileTransferRequest {
	targetPcId: string;
	clientFileName: string;
	serverFilePath?: string;
}

export interface FileTransferResponse {
	success: boolean;
	message: string;
	data?: {
		transfer_id: string;
		file_name: string;
		target_pc_id: string;
		session_id: string;
		status: string;
		file_size_mb: number;
		destination_path: string;
	};
	error?: string;
}

export interface FileTransferStatus {
	transfer_id: string;
	file_name: string;
	target_pc_id: string;
	session_id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
	file_size_mb: number;
	destination_path: string;
	transfer_time: string;
	error_message?: string;
	created_at: string;
	updated_at: string;
}

export interface FileTransferListResponse {
	success: boolean;
	data: FileTransferStatus[];
	count: number;
	error?: string;
}

class FileTransferService {
	private apiUrl = 'http://localhost:8080/api/admin';

	/**
	 * Enviar archivo a un cliente durante una sesión
	 */
	async sendFileToClient(sessionId: string, file: File, targetPcId: string, clientFileName?: string): Promise<FileTransferResponse> {
		try {
			const authHeaders = authService.getAuthHeader();
			
			// Crear FormData para enviar el archivo
			const formData = new FormData();
			formData.append('file', file);
			formData.append('target_pc_id', targetPcId);
			formData.append('client_file_name', clientFileName || file.name);

			const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/files/send`, {
				method: 'POST',
				headers: {
					// No incluir Content-Type para FormData, el browser lo maneja automáticamente
					...authHeaders
				},
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Error al iniciar transferencia');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Error sending file to client:', error);
			throw error;
		}
	}

	/**
	 * Enviar archivo existente en el servidor a un cliente
	 */
	async sendServerFileToClient(sessionId: string, request: FileTransferRequest): Promise<FileTransferResponse> {
		try {
			const authHeaders = authService.getAuthHeader();
			
			const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/files/send`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders
				},
				body: JSON.stringify({
					target_pc_id: request.targetPcId,
					client_file_name: request.clientFileName,
					server_file_path: request.serverFilePath
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Error al iniciar transferencia');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Error sending server file to client:', error);
			throw error;
		}
	}

	/**
	 * Obtener transferencias de una sesión
	 */
	async getSessionTransfers(sessionId: string): Promise<FileTransferListResponse> {
		try {
			const response = await authService.authenticatedFetch(`/admin/sessions/${sessionId}/files`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Error al obtener transferencias');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Error fetching session transfers:', error);
			throw error;
		}
	}

	/**
	 * Obtener estado de una transferencia específica
	 */
	async getTransferStatus(transferId: string): Promise<{ success: boolean; data: FileTransferStatus; error?: string }> {
		try {
			const response = await authService.authenticatedFetch(`/admin/transfers/${transferId}/status`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Error al obtener estado de transferencia');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Error fetching transfer status:', error);
			throw error;
		}
	}

	/**
	 * Obtener transferencias pendientes
	 */
	async getPendingTransfers(): Promise<FileTransferListResponse> {
		try {
			const response = await authService.authenticatedFetch('/admin/transfers/pending');

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Error al obtener transferencias pendientes');
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Error fetching pending transfers:', error);
			throw error;
		}
	}

	/**
	 * Obtener transferencias de un cliente específico
	 */
	async getClientTransfers(clientId: string): Promise<FileTransferListResponse> {
		try {
			// Validar que clientId no sea null o undefined
			if (!clientId || clientId === 'undefined' || clientId === 'null') {
				throw new Error(`ID de cliente inválido: ${clientId}`);
			}

			const response = await authService.authenticatedFetch(`/admin/clients/${clientId}/transfers`);

			if (!response.ok) {
				// Si es 404, devolver respuesta vacía en lugar de error
				if (response.status === 404) {
					return {
						success: true,
						data: [],
						count: 0
					};
				}

				const error = await response.json();
				throw new Error(error.error || 'Error al obtener transferencias del cliente');
			}

			const result = await response.json();
			
			// Validar estructura de respuesta
			if (!result || typeof result !== 'object') {
				throw new Error('Respuesta inválida del servidor');
			}

			// Asegurar que data sea un array
			if (!Array.isArray(result.data)) {
				result.data = [];
			}

			return {
				success: result.success || true,
				data: result.data,
				count: result.count || result.data.length,
				error: result.error
			};
		} catch (error) {
			console.error('Error fetching client transfers:', error);
			
			// En lugar de lanzar error, devolver respuesta vacía para errores de red
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				return {
					success: false,
					data: [],
					count: 0,
					error: 'Error de conexión con el servidor'
				};
			}
			
			throw error;
		}
	}

	/**
	 * Formatear estado de transferencia para mostrar
	 */
	getTransferStatusText(status: string): string {
		switch (status) {
			case 'PENDING':
				return 'Pendiente';
			case 'IN_PROGRESS':
				return 'En progreso';
			case 'COMPLETED':
				return 'Completada';
			case 'FAILED':
				return 'Fallida';
			default:
				return 'Desconocido';
		}
	}

	/**
	 * Obtener clase CSS para el estado de transferencia
	 */
	getTransferStatusClass(status: string): string {
		switch (status) {
			case 'PENDING':
				return 'status-pending';
			case 'IN_PROGRESS':
				return 'status-in-progress';
			case 'COMPLETED':
				return 'status-completed';
			case 'FAILED':
				return 'status-failed';
			default:
				return 'status-unknown';
		}
	}
}

export const fileTransferService = new FileTransferService(); 