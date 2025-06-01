import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	user_id: string;
	username: string;
	role: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	token: string | null;
	loading: boolean;
	error: string | null;
}

const initialState: AuthState = {
	isAuthenticated: false,
	user: null,
	token: null,
	loading: false,
	error: null
};

// Crear el store writable
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,
		
		// Inicializar desde localStorage al cargar la página
		init: () => {
			if (browser) {
				const token = localStorage.getItem('admin_token');
				const user = localStorage.getItem('admin_user');
				
				if (token && user) {
					try {
						const parsedUser = JSON.parse(user);
						set({
							isAuthenticated: true,
							user: parsedUser,
							token: token,
							loading: false,
							error: null
						});
					} catch (error) {
						// Si hay error parseando, limpiar localStorage
						localStorage.removeItem('admin_token');
						localStorage.removeItem('admin_user');
					}
				}
			}
		},

		// Login exitoso
		login: (token: string, user: User) => {
			if (browser) {
				localStorage.setItem('admin_token', token);
				localStorage.setItem('admin_user', JSON.stringify(user));
			}
			
			set({
				isAuthenticated: true,
				user: user,
				token: token,
				loading: false,
				error: null
			});
		},

		// Logout
		logout: () => {
			if (browser) {
				localStorage.removeItem('admin_token');
				localStorage.removeItem('admin_user');
			}
			
			set(initialState);
		},

		// Establecer estado de carga
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},

		// Establecer error
		setError: (error: string | null) => {
			update(state => ({ ...state, error, loading: false }));
		},

		// Limpiar error
		clearError: () => {
			update(state => ({ ...state, error: null }));
		},

		// Verificar si el token está expirado (implementación básica)
		isTokenValid: (): boolean => {
			if (browser) {
				const token = localStorage.getItem('admin_token');
				if (!token) return false;
				
				try {
					// Decodificar JWT básico (solo para verificar expiración)
					const payload = JSON.parse(atob(token.split('.')[1]));
					const currentTime = Math.floor(Date.now() / 1000);
					return payload.exp > currentTime;
				} catch {
					return false;
				}
			}
			return false;
		}
	};
}

export const authStore = createAuthStore(); 