export interface WebSocketEventData {
    // Esta interfaz puede ser utilizada por otros tipos de eventos si es necesario
    // Por ahora, es un marcador de posición genérico si 'data' tiene una estructura común.
    // O puede ser más específico, como unión de todos los posibles 'data' payloads.
    [key: string]: any; 
}

export interface WebSocketEvent {
	type: string;
	timestamp: string; // Considerar usar Date o number (timestamp)
	data: any; // O WebSocketEventData, o un tipo unión más específico como PCConnectionEventData | SessionEventData etc.
}

export interface PCConnectionEventData { // Datos específicos para eventos de conexión de PC
	pcId: string;
	identifier?: string;
	ownerUserId?: string;
	ip?: string;
	status?: 'ONLINE' | 'OFFLINE' | 'CONNECTING';
	oldStatus?: string;
	newStatus?: string;
	timestamp?: number; // Mantener consistencia (string o number)
	event?: string; // Nombre del evento original si es útil
}

// Tipo para el campo 'data' de eventos de PC
export type PCConnectionEvent = WebSocketEvent & { 
    type: 'pc_connected' | 'pc_disconnected' | 'pc_status_changed' | 'pc_registered' | 'pc_list_update';
    data: PCConnectionEventData;
};


// Tipos para control remoto (streaming y comandos)
export interface ScreenFrame {
	session_id: string;
	timestamp: number;
	width: number;
	height: number;
	format: string; // ej. 'jpeg', 'png', 'webp'
	quality?: number; // Para formatos con pérdida
	frame_data: Uint8Array | string; // ArrayBuffer (Uint8Array) o string base64
	sequence_num: number;
}

export interface MouseEventPayload {
	x: number;
	y: number;
	button?: 'left' | 'right' | 'middle';
	deltaX?: number; // Para scroll horizontal
    deltaY?: number; // Para scroll vertical
    // Considerar añadir eventFlags si se necesitan (ej. ctrlKey, shiftKey)
}

export interface KeyboardEventPayload {
	key: string; // ej. 'a', 'A', 'Enter', 'ArrowUp'
	code?: string; // ej. 'KeyA', 'Enter', 'ArrowUp' (depende del sistema)
	text?: string; // Carácter textual si es diferente de la tecla (ej. con AltGr)
	modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'meta'>;
    // Considerar añadir isRepeat: boolean
}

export interface InputCommand {
	session_id: string;
	timestamp: number; // Unix timestamp (ms)
	event_type: 'mouse' | 'keyboard';
	action: string; // ej. 'click', 'mousemove', 'keydown', 'keyup', 'scroll'
	payload: MouseEventPayload | KeyboardEventPayload;
}

// Podrías tener un tipo unión para todos los datos de eventos específicos si es necesario
// export type SpecificEventData = PCConnectionEventData | SessionWebSocketEventData | ScreenFrameData ...etc; 