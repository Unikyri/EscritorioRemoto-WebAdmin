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
	type: 'session_started' | 'session_rejected' | 'session_ended' | 'session_failed' | 'session_accepted';
	session_id: string;
	admin_user_id: string;
	client_pc_id: string;
	start_time?: string;
	end_time?: string;
	end_reason?: string;
	duration?: string;
	error?: string;
	reason?: string;
	status?: string;
} 