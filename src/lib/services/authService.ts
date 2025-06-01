import { authStore, type User } from '../stores/auth';
import { browser } from '$app/environment';

// Configuración de la API
const API_BASE_URL = 'http://localhost:8080/api';

export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface ApiError {
	error: string;
	message: string;
	code: number;
}

class AuthService {
	/**
	 * Realizar login con credenciales
	 */
	async login(username: string, password: string): Promise<LoginResponse> {
		authStore.setLoading(true);
		authStore.clearError();

		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password } as LoginRequest),
			});

			const data = await response.json();

			if (!response.ok) {
				const error = data as ApiError;
				throw new Error(error.message || 'Error de autenticación');
			}

			const loginResponse = data as LoginResponse;
			
			// Guardar en el store
			authStore.login(loginResponse.token, loginResponse.user);
			
			return loginResponse;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
			authStore.setError(errorMessage);
			throw error;
		} finally {
			authStore.setLoading(false);
		}
	}

	/**
	 * Realizar logout
	 */
	logout(): void {
		authStore.logout();
	}

	/**
	 * Obtener token de autorización para headers HTTP
	 */
	getAuthHeader(): { Authorization: string } | {} {
		if (browser) {
			const token = localStorage.getItem('admin_token');
			if (token) {
				return { Authorization: `Bearer ${token}` };
			}
		}
		return {};
	}

	/**
	 * Realizar una petición autenticada a la API
	 */
	async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
		const authHeaders = this.getAuthHeader();
		
		const config: RequestInit = {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...authHeaders,
				...options.headers,
			},
		};

		const response = await fetch(`${API_BASE_URL}${url}`, config);

		// Si el token ha expirado o es inválido
		if (response.status === 401) {
			this.logout();
			throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
		}

		return response;
	}

	/**
	 * Verificar si el usuario está autenticado
	 */
	async checkAuthStatus(): Promise<boolean> {
		if (!browser) return false;

		const token = localStorage.getItem('admin_token');
		if (!token) {
			return false;
		}

		try {
			// Verificar con el backend si el token es válido
			const response = await this.authenticatedFetch('/auth/verify');
			return response.ok;
		} catch {
			// Si hay error, consideramos que no está autenticado
			this.logout();
			return false;
		}
	}

	/**
	 * Verificar health del backend
	 */
	async checkBackendHealth(): Promise<boolean> {
		try {
			const response = await fetch('http://localhost:8080/health');
			return response.ok;
		} catch {
			return false;
		}
	}
}

export const authService = new AuthService(); 