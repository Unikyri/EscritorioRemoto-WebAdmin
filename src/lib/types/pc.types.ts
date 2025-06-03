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