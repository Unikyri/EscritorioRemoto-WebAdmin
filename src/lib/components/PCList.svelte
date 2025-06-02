<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { pcService, type ClientPC } from '$lib/services/pcService';
	import { remoteSessionService, type SessionWebSocketEvent } from '$lib/services/remoteSessionService';
	import { websocketService, type WebSocketEvent, type PCConnectionEvent } from '$lib/services/websocketService';

	// Props
	export let showOnlineOnly = false;

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
		}
		
		// Trigger reactivity
		sessionStates = new Map(sessionStates);
	}

	async function initiateRemoteControl(pc: ClientPC) {
		const pcId = pc.pcId;
		
		try {
			// Establecer estado de "iniciando"
			sessionStates.set(pcId, {
				sessionId: '',
				status: 'initiating',
				message: 'Iniciando solicitud...'
			});
			sessionStates = new Map(sessionStates);
			
			// Llamar a la API para iniciar la sesión
			const response = await remoteSessionService.initiateSession(pcId);
			
			if (response.success) {
				// Actualizar estado a "pendiente"
				sessionStates.set(pcId, {
					sessionId: response.session_id,
					status: 'pending',
					message: 'Esperando aceptación del cliente...'
				});
				sessionStates = new Map(sessionStates);
			} else {
				throw new Error(response.message || 'Error al iniciar sesión remota');
			}
			
		} catch (err) {
			// Manejar error
			const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
			sessionStates.set(pcId, {
				sessionId: '',
				status: 'failed',
				message: errorMessage
			});
			sessionStates = new Map(sessionStates);
			
			// Limpiar estado después de unos segundos
			setTimeout(() => {
				sessionStates.delete(pcId);
				sessionStates = new Map(sessionStates);
			}, 5000);
		}
	}

	function cancelRemoteControl(pcId: string) {
		sessionStates.delete(pcId);
		sessionStates = new Map(sessionStates);
	}

	function getSessionState(pcId: string) {
		return sessionStates.get(pcId);
	}

	// Obtener estadísticas de la lista actual
	$: stats = {
		total: pcs.length,
		online: pcs.filter(pc => pc.connectionStatus === 'ONLINE').length,
		offline: pcs.filter(pc => pc.connectionStatus === 'OFFLINE').length,
		connecting: pcs.filter(pc => pc.connectionStatus === 'CONNECTING').length
	};

	// Filtrar PCs según showOnlineOnly reactivamente
	$: filteredPCs = showOnlineOnly ? pcs.filter(pc => pc.connectionStatus === 'ONLINE') : pcs;
</script>

<div class="pc-list-container">
	<div class="pc-list-header">
		<div class="header-left">
			<h2>
				<svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
					<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
				</svg>
				{showOnlineOnly ? 'PCs Cliente Online' : 'Todos los PCs Cliente'}
			</h2>
			<div class="stats-summary">
				<span class="stat-item total">{stats.total} Total</span>
				<span class="stat-item online">{stats.online} En línea</span>
				<span class="stat-item offline">{stats.offline} Desconectados</span>
				{#if stats.connecting > 0}
					<span class="stat-item connecting">{stats.connecting} Conectando</span>
				{/if}
			</div>
		</div>
	</div>

	{#if lastUpdated}
		<div class="last-updated">
			Última actualización: {lastUpdated}
		</div>
	{/if}

	{#if error}
		<div class="error-message">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z"/>
			</svg>
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="loading-message">
			<div class="spinner"></div>
			Cargando PCs cliente...
		</div>
	{:else if filteredPCs.length === 0}
		<div class="empty-message">
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
			</svg>
			<h3>{showOnlineOnly ? 'No hay PCs online' : 'No hay PCs registrados'}</h3>
			<p>{showOnlineOnly ? 'Ningún PC cliente está conectado actualmente.' : 'Aún no se han registrado PCs cliente en el sistema.'}</p>
		</div>
	{:else}
		<div class="pc-grid">
			{#each filteredPCs as pc (pc.pcId)}
				{@const sessionState = getSessionState(pc.pcId)}
				<div class="pc-card" class:online={pc.connectionStatus === 'ONLINE'} class:has-session={sessionState}>
					<div class="pc-card-header">
						<div class="pc-identifier">
							<svg viewBox="0 0 24 24" fill="currentColor" class="pc-icon">
								<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
							</svg>
							<h3>{pc.identifier}</h3>
						</div>
						<div class="connection-status {pcService.getConnectionStatusClass(pc.connectionStatus)}">
							<div class="status-indicator"></div>
							<span>{pcService.getConnectionStatusText(pc.connectionStatus)}</span>
						</div>
					</div>
					
					<div class="pc-card-body">
						<div class="pc-info">
							<div class="info-item">
								<span class="label">Propietario:</span>
								<span class="value">{pc.ownerUsername}</span>
							</div>
							<div class="info-item">
								<span class="label">IP:</span>
								<span class="value">{pc.ip}</span>
							</div>
							<div class="info-item">
								<span class="label">Registrado:</span>
								<span class="value">{pcService.formatDate(pc.registeredAt)}</span>
							</div>
							{#if pc.lastSeenAt}
								<div class="info-item">
									<span class="label">Última vez visto:</span>
									<span class="value">{pcService.formatDate(pc.lastSeenAt)}</span>
								</div>
							{/if}
						</div>

						{#if sessionState}
							<div class="session-status {sessionState.status}">
								<div class="session-status-content">
									{#if sessionState.status === 'initiating'}
										<div class="status-spinner"></div>
									{:else if sessionState.status === 'pending'}
										<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
											<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
										</svg>
									{:else if sessionState.status === 'rejected'}
										<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
											<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
										</svg>
									{:else if sessionState.status === 'failed'}
										<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
											<path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z"/>
										</svg>
									{:else if sessionState.status === 'active'}
										<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
											<path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
										</svg>
									{/if}
									<span class="status-message">{sessionState.message}</span>
								</div>
								{#if sessionState.status === 'pending' || sessionState.status === 'initiating'}
									<button class="cancel-btn" on:click={() => cancelRemoteControl(pc.pcId)}>
										Cancelar
									</button>
								{/if}
							</div>
						{/if}
					</div>
					
					<div class="pc-card-footer">
						<div class="pc-id">ID: {pc.pcId}</div>
						<div class="pc-actions">
							{#if pc.connectionStatus === 'ONLINE' && !sessionState}
								<button 
									class="action-btn control" 
									title="Iniciar sesión de control remoto" 
									aria-label="Controlar {pc.identifier}"
									on:click={() => initiateRemoteControl(pc)}
								>
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3"/>
									</svg>
									Controlar
								</button>
							{/if}
							<button class="action-btn info" title="Ver detalles" aria-label="Ver detalles de {pc.identifier}">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.pc-list-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.pc-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.header-left h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.header-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	.stats-summary {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.stat-item {
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
	}

	.header-status {
		display: flex;
		align-items: center;
	}

	.observer-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		backdrop-filter: blur(10px);
		font-size: 0.875rem;
	}

	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.status-dot.online { 
		background: #22c55e; 
		animation: pulse 2s infinite;
	}
	
	.status-dot.offline { 
		background: #ef4444; 
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.status-text {
		font-weight: 500;
	}

	.last-updated {
		padding: 0.75rem 1.5rem;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.875rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.error-message, .loading-message, .empty-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 3rem;
		text-align: center;
	}

	.error-message {
		color: #dc2626;
		background: #fef2f2;
	}

	.loading-message {
		color: #1f2937;
	}

	.empty-message {
		flex-direction: column;
		color: #6b7280;
	}

	.empty-message svg {
		width: 3rem;
		height: 3rem;
		opacity: 0.5;
		margin-bottom: 1rem;
	}

	.empty-message h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		color: #374151;
	}

	.spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.pc-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.pc-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		overflow: hidden;
		transition: all 0.2s;
	}

	.pc-card:hover {
		border-color: #cbd5e1;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.pc-card.online {
		border-color: #22c55e;
		box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.1);
	}

	.pc-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8fafc;
		border-bottom: 1px solid #e2e8f0;
	}

	.pc-identifier {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pc-identifier h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.pc-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #6b7280;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-indicator {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.status-online .status-indicator { background: #22c55e; }
	.status-offline .status-indicator { background: #ef4444; }
	.status-connecting .status-indicator { background: #f59e0b; animation: pulse 2s infinite; }

	.status-online { color: #22c55e; }
	.status-offline { color: #ef4444; }
	.status-connecting { color: #f59e0b; }

	.pc-card-body {
		padding: 1rem;
	}

	.pc-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.info-item .label {
		color: #6b7280;
		font-weight: 500;
	}

	.info-item .value {
		color: #1f2937;
		font-weight: 600;
	}

	.pc-card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8fafc;
		border-top: 1px solid #e2e8f0;
	}

	.pc-id {
		font-size: 0.75rem;
		color: #6b7280;
		font-family: monospace;
	}

	.pc-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		border-color: #cbd5e1;
		background: #f8fafc;
	}

	.action-btn.connect {
		border-color: #22c55e;
		color: #22c55e;
	}

	.action-btn.connect:hover {
		background: #22c55e;
		color: white;
	}

	.action-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.action-btn.control {
		border-color: #667eea;
		color: #667eea;
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem;
		width: auto;
		height: auto;
		gap: 0.25rem;
	}

	.action-btn.control:hover {
		background: #667eea;
		color: white;
	}

	.action-btn.control svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.session-status {
		margin-top: 1rem;
		padding: 0.75rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.session-status.initiating {
		background: #eff6ff;
		border: 1px solid #dbeafe;
	}

	.session-status.pending {
		background: #fffbeb;
		border: 1px solid #fed7aa;
	}

	.session-status.rejected {
		background: #fef2f2;
		border: 1px solid #fecaca;
	}

	.session-status.failed {
		background: #fef2f2;
		border: 1px solid #fecaca;
	}

	.session-status.active {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
	}

	.session-status-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.status-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.status-icon {
		width: 1rem;
		height: 1rem;
	}

	.session-status.initiating .status-icon { color: #3b82f6; }
	.session-status.pending .status-icon { color: #f59e0b; }
	.session-status.rejected .status-icon { color: #ef4444; }
	.session-status.failed .status-icon { color: #ef4444; }
	.session-status.active .status-icon { color: #10b981; }

	.status-message {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.session-status.initiating .status-message { color: #1e40af; }
	.session-status.pending .status-message { color: #d97706; }
	.session-status.rejected .status-message { color: #dc2626; }
	.session-status.failed .status-message { color: #dc2626; }
	.session-status.active .status-message { color: #059669; }

	.cancel-btn {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		color: #6b7280;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.pc-card.has-session {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.stat-item.online { background: rgba(34, 197, 94, 0.3); }
	.stat-item.offline { background: rgba(239, 68, 68, 0.3); }
	.stat-item.connecting { background: rgba(245, 158, 11, 0.3); }
</style> 