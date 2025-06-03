<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { pcService } from '$lib/services/pcService';
	import type { ClientPC } from '$lib/types/pc.types';
	import { remoteSessionService } from '$lib/services/remoteSessionService';
	import type { SessionWebSocketEvent } from '$lib/types/session.types';
	import { websocketService } from '$lib/services/websocketService';
	import type { WebSocketEvent, PCConnectionEvent } from '$lib/types/websocket.types';

	// Props
	export let showOnlineOnly = false;
	export let onRemoteControl: ((pc: ClientPC) => Promise<void>) | null = null;
	export let buttonStates: Map<string, boolean> = new Map();

	// State
	let pcs: ClientPC[] = [];
	let loading = false;
	let error = '';
	let lastUpdated = '';

	// Estado de sesiones remotas
	let sessionStates: Map<string, {
		sessionId: string;
		status: 'initiating' | 'pending' | 'connecting' | 'active' | 'rejected' | 'failed';
		message: string;
	}> = new Map();

	onMount(() => {
		loadPCs();
		
		// Conectar WebSocket para actualizaciones en tiempo real
		if (!websocketService.isConnected()) {
			websocketService.connect();
		}
		
		// Suscribirse a eventos de PCs con nombres correctos del backend
		websocketService.subscribe('pc_connected', handlePCEvent);
		websocketService.subscribe('pc_disconnected', handlePCEvent);
		websocketService.subscribe('pc_status_changed', handlePCEvent);
		websocketService.subscribe('pc_registered', handlePCEvent);
		websocketService.subscribe('pc_list_update', handlePCEvent);
		
		// Suscribirse a eventos de sesiones remotas
		websocketService.subscribe('session_started', handleSessionEvent);
		websocketService.subscribe('session_rejected', handleSessionEvent);
		websocketService.subscribe('session_failed', handleSessionEvent);
		websocketService.subscribe('session_ended', handleSessionEvent);
	});

	onDestroy(() => {
		// Desuscribirse de eventos WebSocket
		websocketService.unsubscribe('pc_connected', handlePCEvent);
		websocketService.unsubscribe('pc_disconnected', handlePCEvent);
		websocketService.unsubscribe('pc_status_changed', handlePCEvent);
		websocketService.unsubscribe('pc_registered', handlePCEvent);
		websocketService.unsubscribe('pc_list_update', handlePCEvent);
		
		websocketService.unsubscribe('session_started', handleSessionEvent);
		websocketService.unsubscribe('session_rejected', handleSessionEvent);
		websocketService.unsubscribe('session_failed', handleSessionEvent);
		websocketService.unsubscribe('session_ended', handleSessionEvent);
	});

	async function loadPCs() {
		loading = true;
		error = '';
		
		try {
			if (showOnlineOnly) {
				pcs = await pcService.getOnlineClientPCs();
			} else {
				pcs = await pcService.getAllClientPCs();
			}
			lastUpdated = new Date().toLocaleTimeString('es-ES');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error desconocido';
			console.error('Error loading PCs:', err);
		} finally {
			loading = false;
		}
	}

	function handlePCEvent(event: WebSocketEvent) {
		console.log('PC Event received:', event);
		
		// Para todos los eventos de PC, simplemente recargar la lista
		// Esto garantiza que la UI se actualice inmediatamente sin problemas de reactividad
		if (event.type === 'pc_registered') {
			console.log('New PC registered - reloading list');
			loadPCs();
		} else if (event.type === 'pc_connected') {
			console.log('PC connected - reloading list');
			loadPCs();
		} else if (event.type === 'pc_disconnected') {
			console.log('PC disconnected - reloading list');
			loadPCs();
		} else if (event.type === 'pc_status_changed') {
			console.log('PC status changed - reloading list');
			loadPCs();
		} else if (event.type === 'pc_list_update') {
			console.log('PC list update requested - reloading list');
			loadPCs();
		}
		
		// Actualizar timestamp
		lastUpdated = new Date().toLocaleTimeString('es-ES');
	}

	function handleSessionEvent(event: WebSocketEvent) {
		console.log('Session Event received:', event);
		
		const sessionEvent = event.data as SessionWebSocketEvent;
		const pcId = sessionEvent.client_pc_id;
		
		if (event.type === 'session_started') {
			// Sesión iniciada exitosamente - navegar a la vista de control remoto
			sessionStates.set(pcId, {
				sessionId: sessionEvent.session_id,
				status: 'active',
				message: 'Sesión iniciada - Conectando...'
			});
			
			// Navegar a la vista de control remoto
			setTimeout(() => {
				goto(`/remote-control/${sessionEvent.session_id}`);
			}, 1000);
			
		} else if (event.type === 'session_rejected') {
			// Sesión rechazada por el cliente
			sessionStates.set(pcId, {
				sessionId: sessionEvent.session_id,
				status: 'rejected',
				message: sessionEvent.reason || 'El cliente rechazó la solicitud de control remoto'
			});
			
			// Limpiar estado después de unos segundos
			setTimeout(() => {
				sessionStates.delete(pcId);
				sessionStates = new Map(sessionStates);
			}, 5000);
			
		} else if (event.type === 'session_failed') {
			// Sesión falló
			sessionStates.set(pcId, {
				sessionId: sessionEvent.session_id,
				status: 'failed',
				message: sessionEvent.error || 'Error al establecer la sesión'
			});
			
			// Limpiar estado después de unos segundos
			setTimeout(() => {
				sessionStates.delete(pcId);
				sessionStates = new Map(sessionStates);
			}, 5000);
			
		} else if (event.type === 'session_ended') {
			// Sesión terminada - limpiar estado inmediatamente
			console.log('🔚 Session ended for PC:', pcId);
			sessionStates.delete(pcId);
			sessionStates = new Map(sessionStates);
		}
		
		// Trigger reactivity
		 sessionStates = new Map(sessionStates);
	}

	async function initiateRemoteControl(pc: ClientPC) {
		console.log('🚀 initiateRemoteControl called with PC:', pc);
		const pcId = pc.pcId;
		
		// Si hay un callback externo, usarlo en lugar de la lógica interna
		if (onRemoteControl) {
			try {
				await onRemoteControl(pc);
			} catch (err) {
				console.error('Error in external remote control handler:', err);
			}
			return;
		}
		
		// Lógica original para compatibilidad hacia atrás
		try {
			console.log('🔄 Setting initiating state for PC:', pcId);
			// Establecer estado de "iniciando"
			sessionStates.set(pcId, {
				sessionId: '',
				status: 'initiating',
				message: 'Iniciando solicitud...'
			});
			sessionStates = new Map(sessionStates);
			
			console.log('📡 Calling remoteSessionService.initiateSession for PC:', pcId);
			// Llamar a la API para iniciar la sesión
			const response = await remoteSessionService.initiateSession(pcId);
			console.log('📥 API Response:', response);
			
			if (response.success) {
				console.log('✅ Session initiation successful, setting pending state');
				// Actualizar estado a "pendiente"
				sessionStates.set(pcId, {
					sessionId: response.session_id,
					status: 'pending',
					message: 'Esperando aceptación del cliente...'
				});
				sessionStates = new Map(sessionStates);
			} else {
				console.error('❌ Session initiation failed:', response.message);
				throw new Error(response.message || 'Error al iniciar sesión remota');
			}
			
		} catch (err: any) {
			console.error('Error initiating remote control in PCList:', err);
			
			sessionStates.set(pcId, {
				sessionId: '',
				status: 'failed',
				message: err.message || 'Error desconocido'
			});
			sessionStates = new Map(sessionStates);
			
			// Limpiar estado después de unos segundos
			setTimeout(() => {
				sessionStates.delete(pcId);
				sessionStates = new Map(sessionStates);
			}, 5000);
		} finally {
			// El estado de carga es manejado por el componente padre (Dashboard)
		}
	}

	function getSessionInfo(pcId: string) {
		return sessionStates.get(pcId);
	}
</script>

<div class="pc-list-container">
	{#if loading}
		<div class="loading-indicator">
			<div class="spinner"></div>
			<p>Cargando PCs...</p>
		</div>
	{:else if error}
		<div class="error-message">
			<p>Error al cargar PCs: {error}</p>
			<button on:click={loadPCs} class="retry-btn">Reintentar</button>
		</div>
	{:else if pcs.length === 0}
		<div class="empty-state">
			<svg viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
				<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z" />
			</svg>
			<p>{showOnlineOnly ? 'No hay PCs en línea en este momento.' : 'No hay PCs registrados.'}</p>
			{#if !showOnlineOnly}
				<p class="subtle-text">Asegúrate de que los PCs cliente estén encendidos y conectados a la red.</p>
			{/if}
		</div>
	{:else}
		<ul class="pc-list">
			{#each pcs as pc (pc.pcId)}
				{@const sessionInfo = getSessionInfo(pc.pcId)}
				{@const isLoadingButton = buttonStates.get(`loading-${pc.pcId}`)}
				<li 
					class="pc-item {pc.connectionStatus.toLowerCase()}"
					class:online={pc.connectionStatus === 'ONLINE'}
					class:offline={pc.connectionStatus === 'OFFLINE'}
					class:connecting={pc.connectionStatus === 'CONNECTING'}
				>
					<div class="pc-info">
						<div class="status-dot-container">
							<span class="status-dot"></span>
						</div>
						<div class="pc-details">
							<span class="pc-identifier">{pc.identifier || 'PC Desconocido'}</span>
							<span class="pc-owner">Usuario: {pc.ownerUsername || 'N/A'}</span>
							<span class="pc-ip">IP: {pc.ip || 'N/A'}</span>
						</div>
					</div>

					<div class="pc-status">
						<span class="status-tag {pc.connectionStatus.toLowerCase()}">
							{pcService.getConnectionStatusText(pc.connectionStatus)}
						</span>
						<span class="last-seen">Visto: {pc.lastSeenAt ? pcService.formatDate(pc.lastSeenAt) : 'Nunca'}</span>
					</div>

					<div class="pc-actions">
						{#if pc.connectionStatus === 'ONLINE'}
							{#if sessionInfo && (sessionInfo.status === 'initiating' || sessionInfo.status === 'pending' || sessionInfo.status === 'connecting' || isLoadingButton)}
								<button class="action-btn initiating" disabled>
									<div class="mini-spinner"></div>
									{#if sessionInfo.status === 'initiating' || isLoadingButton}Iniciando...{:else if sessionInfo.status === 'pending'}Esperando...{:else}Conectando...{/if}
								</button>
							{:else if sessionInfo && sessionInfo.status === 'active'}
								<button class="action-btn active-session" on:click={() => goto(`/remote-control/${sessionInfo.sessionId}`)} title="Ir a la sesión activa">
									<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.55,4.45L21.5,5.4L16,10.9L13.1,8L15.05,6.05C16.25,4.85 18.2,4.35 19.5,4.35C19.83,4.35 20.17,4.4 20.55,4.45M19.5,0C17.9,0 16.35,0.55 15.2,1.7L11,5.9L2,14.9V20H7.1L16.1,11L20.3,6.8C22.65,4.45 22.5,0.75 20.05,0.2L19.5,0Z" /></svg>
									En curso
								</button>
							{:else if sessionInfo && sessionInfo.status === 'rejected'}
								<button class="action-btn rejected" title="{sessionInfo.message}" disabled>
									<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12,2C17.5,2 22,6.5 22,12S17.5,22 12,22 2,17.5 2,12 6.5,2 12,2M12,4C10.1,4 8.4,4.6 7.1,5.7L18.3,16.9C19.4,15.6 20,13.9 20,12C20,7.6 16.4,4 12,4M5.7,7.1C4.6,8.4 4,10.1 4,12C4,16.4 7.6,20 12,20C13.9,20 15.6,19.4 16.9,18.3L7.1,5.7Z" /></svg>
									Rechazado
								</button>
							{:else if sessionInfo && sessionInfo.status === 'failed'}
								<button class="action-btn error" title="{sessionInfo.message}" disabled>
									<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>
									Fallido
								</button>
							{:else}
								<button class="action-btn remote-control" on:click={() => initiateRemoteControl(pc)} title="Iniciar Control Remoto">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M18,14V10H16V14H18M15,14H13V10H15V14M12,14V10H10V14H12M22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6M20,6H4V18H20V6Z" />
									</svg>
									Control Remoto
								</button>
							{/if}
						{:else}
							<button class="action-btn disabled" disabled title="El PC no está en línea">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M18,14V10H16V14H18M15,14H13V10H15V14M12,14V10H10V14H12M22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6M20,6H4V18H20V6Z" />
								</svg>
								Control Remoto
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	<p class="last-updated-text">Última actualización: {lastUpdated || 'Nunca'}</p>
</div>

<style>
	.pc-list-container {
		background-color: #ffffff;
		border-radius: 12px;
		/* box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05); */
		padding: 1.5rem;
		min-height: 300px;
		display: flex;
		flex-direction: column;
		border: 1px solid #e5e7eb; /* Borde más sutil */
	}

	.loading-indicator, .error-message, .empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex-grow: 1;
		text-align: center;
		padding: 2rem;
		color: #6b7280;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		color: #9ca3af;
		margin-bottom: 1rem;
	}

	.empty-state p {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.subtle-text {
		font-size: 0.9rem;
		color: #9ca3af;
	}

	.retry-btn {
		background-color: #3b82f6;
		color: white;
		padding: 0.6rem 1.2rem;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s;
		font-weight: 500;
	}
	.retry-btn:hover {
		background-color: #2563eb;
	}

	.pc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 1rem;
		/* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
	}

	.pc-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background-color: #f9fafb;
		border-radius: 10px;
		border: 1px solid #e5e7eb;
		transition: all 0.2s ease-in-out;
	}

	.pc-item:hover {
		transform: translateY(-3px);
		box-shadow: 0 6px 12px rgba(0,0,0,0.07);
		border-color: #d1d5db;
	}

	.pc-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.status-dot-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
	}

	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		transition: background-color 0.3s;
	}

	.pc-item.online .status-dot {
		background-color: #22c55e; /* green-500 */
		animation: pulse-green 2s infinite;
	}

	.pc-item.offline .status-dot {
		background-color: #ef4444; /* red-500 */
	}

	.pc-item.connecting .status-dot {
		background-color: #eab308; /* yellow-500 */
		animation: pulse-yellow 1.5s infinite;
	}

	@keyframes pulse-green {
		0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
		70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
		100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
	}

	@keyframes pulse-yellow {
		0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7); }
		70% { box-shadow: 0 0 0 8px rgba(234, 179, 8, 0); }
		100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
	}

	.pc-details {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.pc-identifier {
		font-weight: 600;
		color: #1f2937;
		font-size: 1rem;
	}

	.pc-owner, .pc-ip {
		font-size: 0.8rem;
		color: #6b7280;
		font-family: monospace;
	}

	.pc-status {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.status-tag {
		padding: 0.25rem 0.6rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-tag.online {
		background-color: #dcfce7; /* green-100 */
		color: #166534; /* green-800 */
	}
	.status-tag.offline {
		background-color: #fee2e2; /* red-100 */
		color: #991b1b; /* red-800 */
	}
	.status-tag.connecting {
		background-color: #fef9c3; /* yellow-100 */
		color: #854d0e; /* yellow-800 */
	}

	.last-seen {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.pc-actions {
		display: flex;
		align-items: center;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border: 1px solid transparent;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 160px; /* Ancho mínimo para consistencia */
		text-align: center;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	.action-btn.remote-control {
		background-color: #3b82f6; /* blue-500 */
		color: white;
		border-color: #3b82f6;
	}
	.action-btn.remote-control:hover {
		background-color: #2563eb; /* blue-600 */
		border-color: #2563eb;
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
	}

	.action-btn.disabled {
		background-color: #e5e7eb; /* gray-200 */
		color: #9ca3af; /* gray-400 */
		cursor: not-allowed;
		border-color: #e5e7eb;
	}

	.action-btn.initiating, .action-btn.active-session, .action-btn.rejected, .action-btn.error {
		color: white;
		cursor: default;
	}

	.action-btn.initiating {
		background-color: #fbbf24; /* amber-400 */
		border-color: #fbbf24;
	}

	.action-btn.active-session {
		background-color: #22c55e; /* green-500 */
		border-color: #22c55e;
	}
	.action-btn.active-session:hover {
		background-color: #16a34a; /* green-600 */
		border-color: #16a34a;
	}

	.action-btn.rejected {
		background-color: #f43f5e; /* rose-500 */
		border-color: #f43f5e;
	}
	.action-btn.error {
		background-color: #ef4444; /* red-500 */
		border-color: #ef4444;
	}

	.mini-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255,255,255,0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.last-updated-text {
		text-align: right;
		font-size: 0.8rem;
		color: #9ca3af;
		margin-top: 1.5rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.pc-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}
		.pc-info {
			width: 100%;
		}
		.pc-status {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			width: 100%;
		}
		.pc-actions {
			width: 100%;
		}
		.action-btn {
			width: 100%;
		}
		.last-updated-text {
			text-align: center;
			margin-top: 1rem;
		}
	}
</style> 