<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pcService, type ClientPC } from '$lib/services/pcService';
	import { websocketService, type WebSocketEvent, type PCConnectionEvent } from '$lib/services/websocketService';

	// Props
	export let showOnlineOnly = false;
	export let autoRefresh = true;
	export let refreshInterval = 5000; // 5 segundos por defecto

	// State
	let pcs: ClientPC[] = [];
	let loading = false;
	let error = '';
	let lastUpdated = '';
	let refreshTimer: number | null = null;

	onMount(() => {
		loadPCs();
		if (autoRefresh) {
			startAutoRefresh();
		}
		
		// Conectar WebSocket para actualizaciones en tiempo real
		if (!websocketService.isConnected()) {
			websocketService.connect();
		}
		
		// Suscribirse a eventos de PCs
		websocketService.subscribe('PC_CONNECTED', handlePCEvent);
		websocketService.subscribe('PC_DISCONNECTED', handlePCEvent);
		websocketService.subscribe('PC_STATUS_CHANGED', handlePCEvent);
	});

	onDestroy(() => {
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}
		
		// Desuscribirse de eventos WebSocket
		websocketService.unsubscribe('PC_CONNECTED', handlePCEvent);
		websocketService.unsubscribe('PC_DISCONNECTED', handlePCEvent);
		websocketService.unsubscribe('PC_STATUS_CHANGED', handlePCEvent);
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

	function startAutoRefresh() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
		}
		refreshTimer = setInterval(loadPCs, refreshInterval);
	}

	function stopAutoRefresh() {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			startAutoRefresh();
		} else {
			stopAutoRefresh();
		}
	}

	function handlePCEvent(event: WebSocketEvent) {
		console.log('PC Event received:', event);
		
		const pcEvent = event.data as PCConnectionEvent;
		
		// Actualizar el PC específico en la lista
		const pcIndex = pcs.findIndex(pc => pc.pcId === pcEvent.pcId);
		
		if (pcEvent.type === 'PC_CONNECTED') {
			// Si el PC no está en la lista, recargar toda la lista
			if (pcIndex === -1) {
				loadPCs();
			} else {
				// Actualizar estado del PC existente
				pcs[pcIndex] = {
					...pcs[pcIndex],
					connectionStatus: 'ONLINE',
					lastSeenAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};
				pcs = [...pcs]; // Trigger reactivity
			}
		} else if (pcEvent.type === 'PC_DISCONNECTED') {
			if (pcIndex !== -1) {
				pcs[pcIndex] = {
					...pcs[pcIndex],
					connectionStatus: 'OFFLINE',
					updatedAt: new Date().toISOString()
				};
				pcs = [...pcs]; // Trigger reactivity
			}
		} else if (pcEvent.type === 'PC_STATUS_CHANGED' && pcEvent.newStatus) {
			if (pcIndex !== -1) {
				pcs[pcIndex] = {
					...pcs[pcIndex],
					connectionStatus: pcEvent.newStatus,
					lastSeenAt: pcEvent.newStatus === 'ONLINE' ? new Date().toISOString() : pcs[pcIndex].lastSeenAt,
					updatedAt: new Date().toISOString()
				};
				pcs = [...pcs]; // Trigger reactivity
			}
		}
		
		// Actualizar timestamp
		lastUpdated = new Date().toLocaleTimeString('es-ES');
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
		
		<div class="header-controls">
			<button 
				class="control-btn" 
				class:active={autoRefresh}
				on:click={toggleAutoRefresh}
				title={autoRefresh ? 'Desactivar actualización automática' : 'Activar actualización automática'}
			>
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
				</svg>
				Auto
			</button>
			
			<button 
				class="control-btn refresh" 
				on:click={loadPCs}
				disabled={loading}
				title="Actualizar ahora"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" class:loading>
					<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
				</svg>
				Actualizar
			</button>
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
				<div class="pc-card" class:online={pc.connectionStatus === 'ONLINE'}>
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
					</div>
					
					<div class="pc-card-footer">
						<div class="pc-id">ID: {pc.pcId}</div>
						<div class="pc-actions">
							{#if pc.connectionStatus === 'ONLINE'}
								<button class="action-btn connect" title="Iniciar sesión remota" aria-label="Iniciar sesión remota en {pc.identifier}">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M8,3A2,2 0 0,0 6,5V9A2,2 0 0,1 4,11H3V13H4A2,2 0 0,1 6,15V19A2,2 0 0,0 8,21H10V19H8V14A2,2 0 0,0 6,12A2,2 0 0,0 8,10V5H10V3M16,3A2,2 0 0,1 18,5V9A2,2 0 0,0 20,11H21V13H20A2,2 0 0,0 18,15V19A2,2 0 0,1 16,21H14V19H16V14A2,2 0 0,1 18,12A2,2 0 0,1 16,10V5H14V3"/>
									</svg>
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

	.stat-item.online { background: rgba(34, 197, 94, 0.3); }
	.stat-item.offline { background: rgba(239, 68, 68, 0.3); }
	.stat-item.connecting { background: rgba(245, 158, 11, 0.3); }

	.header-controls {
		display: flex;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(10px);
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	.control-btn.active {
		background: rgba(34, 197, 94, 0.3);
		border-color: rgba(34, 197, 94, 0.5);
	}

	.control-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.control-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.loading {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

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
</style> 