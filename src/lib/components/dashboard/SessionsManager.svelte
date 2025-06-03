<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { remoteSessionService } from '$lib/services/remoteSessionService';
	import { websocketService } from '$lib/services/websocketService';
	import type { WebSocketEvent } from '$lib/types/websocket.types';
	import type { SessionSummary } from '$lib/types/session.types';

	// Estado de sesiones
	let sessions: SessionSummary[] = [];
	let loading = false;
	let error = '';
	let lastUpdated = '';

	onMount(() => {
		loadSessions();
		
		// Conectar WebSocket para actualizaciones en tiempo real
		if (!websocketService.isConnected()) {
			websocketService.connect();
		}
		
		// Suscribirse a eventos de sesiones
		websocketService.subscribe('session_started', handleSessionEvent);
		websocketService.subscribe('session_accepted', handleSessionEvent);
		websocketService.subscribe('session_rejected', handleSessionEvent);
		websocketService.subscribe('session_failed', handleSessionEvent);
		websocketService.subscribe('session_ended', handleSessionEvent);
	});

	onDestroy(() => {
		// Desuscribirse de eventos WebSocket
		websocketService.unsubscribe('session_started', handleSessionEvent);
		websocketService.unsubscribe('session_accepted', handleSessionEvent);
		websocketService.unsubscribe('session_rejected', handleSessionEvent);
		websocketService.unsubscribe('session_failed', handleSessionEvent);
		websocketService.unsubscribe('session_ended', handleSessionEvent);
	});

	async function loadSessions() {
		loading = true;
		error = '';
		
		try {
			const activeSessions = await remoteSessionService.getActiveSessions();
			const userSessions = await remoteSessionService.getUserSessions();
			
			// Asegurar que tenemos arrays válidos, incluso si la API retorna null/undefined
			const safeActiveSessions = Array.isArray(activeSessions) ? activeSessions : [];
			const safeUserSessions = Array.isArray(userSessions) ? userSessions : [];
			
			// Combinar sesiones activas y del usuario, eliminando duplicados
			const allSessions = [...safeActiveSessions];
			safeUserSessions.forEach((userSession: SessionSummary) => {
				if (!allSessions.find(session => session.session_id === userSession.session_id)) {
					allSessions.push(userSession);
				}
			});
			
			sessions = allSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
			lastUpdated = new Date().toLocaleTimeString('es-ES');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error desconocido';
			console.error('Error loading sessions:', err);
		} finally {
			loading = false;
		}
	}

	function handleSessionEvent(event: WebSocketEvent) {
		console.log('Session Event received in SessionsManager:', event);
		
		// Recargar sesiones cuando hay cambios
		if (['session_started', 'session_accepted', 'session_rejected', 'session_failed', 'session_ended'].includes(event.type)) {
			loadSessions();
		}
	}

	async function endSession(sessionId: string) {
		if (!confirm('¿Estás seguro de que deseas finalizar esta sesión?')) {
			return;
		}
		
		try {
			await remoteSessionService.endSession(sessionId);
			console.log('✅ Session ended successfully:', sessionId);
			
			// Recargar sesiones después de finalizar
			setTimeout(() => {
				loadSessions();
			}, 500);
		} catch (err) {
			console.error('Error ending session:', err);
			alert('Error al finalizar la sesión: ' + (err instanceof Error ? err.message : 'Error desconocido'));
		}
	}

	function viewSession(sessionId: string) {
		goto(`/remote-control/${sessionId}`);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'ACTIVE': return 'status-active';
			case 'PENDING_APPROVAL': return 'status-pending';
			case 'REJECTED': return 'status-rejected';
			case 'FAILED': return 'status-failed';
			case 'ENDED_SUCCESSFULLY': 
			case 'ENDED_BY_ADMIN': 
			case 'ENDED_BY_CLIENT': return 'status-ended';
			default: return 'status-unknown';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'ACTIVE': return 'Activa';
			case 'PENDING_APPROVAL': return 'Pendiente';
			case 'REJECTED': return 'Rechazada';
			case 'FAILED': return 'Fallida';
			case 'ENDED_SUCCESSFULLY': return 'Finalizada';
			case 'ENDED_BY_ADMIN': return 'Finalizada por Admin';
			case 'ENDED_BY_CLIENT': return 'Finalizada por Cliente';
			default: return status;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getSessionDuration(session: SessionSummary): string {
		if (!session.start_time) return 'N/A';
		
		const start = new Date(session.start_time);
		const end = session.end_time ? new Date(session.end_time) : new Date();
		const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
		
		if (duration < 60) return `${duration}s`;
		if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
		return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
	}
</script>

<div class="sessions-container">
	<div class="sessions-header">
		<div class="header-content">
			<h2>
				<svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
					<path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 2a8 8 0 0 1 8 8a8 8 0 0 1-8 8a8 8 0 0 1-8-8a8 8 0 0 1 8-8m1 3h-2v6l5.25 3.15l.75-1.23L13 11V7Z"/>
				</svg>
				Gestión de Sesiones Remotas
			</h2>
			<button class="refresh-btn" on:click={loadSessions} title="Actualizar" aria-label="Actualizar lista de sesiones">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
				</svg>
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading-indicator">
			<div class="spinner"></div>
			<p>Cargando sesiones...</p>
		</div>
	{:else if error}
		<div class="error-message">
			<p>Error al cargar sesiones: {error}</p>
			<button on:click={loadSessions} class="retry-btn">Reintentar</button>
		</div>
	{:else if sessions.length === 0}
		<div class="empty-state">
			<svg viewBox="0 0 24 24" fill="currentColor" class="empty-icon">
				<path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 2a8 8 0 0 1 8 8a8 8 0 0 1-8 8a8 8 0 0 1-8-8a8 8 0 0 1 8-8Z"/>
			</svg>
			<p>No hay sesiones registradas</p>
			<small>Las sesiones aparecerán aquí cuando se inicien</small>
		</div>
	{:else}
		<div class="sessions-list">
			{#each sessions as session (session.session_id)}
				<div class="session-item {getStatusColor(session.status)}">
					<div class="session-info">
						<div class="session-header">
							<span class="session-id">ID: {session.session_id.substring(0, 8)}...</span>
							<span class="session-status {getStatusColor(session.status)}">
								{getStatusText(session.status)}
							</span>
						</div>
						<div class="session-details">
							<div class="detail-item">
								<span class="detail-label">PC Cliente:</span>
								<span class="detail-value">{session.client_pc_id.substring(0, 8)}...</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Admin:</span>
								<span class="detail-value">{session.admin_user_id.substring(0, 8)}...</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Iniciada:</span>
								<span class="detail-value">{formatDate(session.created_at)}</span>
							</div>
							<div class="detail-item">
								<span class="detail-label">Duración:</span>
								<span class="detail-value">{getSessionDuration(session)}</span>
							</div>
						</div>
					</div>
					
					<div class="session-actions">
						{#if session.status === 'ACTIVE'}
							<button class="action-btn view" on:click={() => viewSession(session.session_id)} title="Ver sesión">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
								</svg>
								Ver
							</button>
							<button class="action-btn end" on:click={() => endSession(session.session_id)} title="Finalizar sesión">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
								</svg>
								Finalizar
							</button>
						{:else if session.status === 'PENDING_APPROVAL'}
							<button class="action-btn pending" disabled title="Esperando respuesta del cliente">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
								</svg>
								Pendiente
							</button>
						{:else}
							<button class="action-btn view-only" on:click={() => viewSession(session.session_id)} title="Ver detalles">
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
								</svg>
								Ver
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	{#if lastUpdated}
		<p class="last-updated">Última actualización: {lastUpdated}</p>
	{/if}
</div>

<style>
	.sessions-container {
		background-color: #ffffff;
		border-radius: 12px;
		padding: 1.5rem;
		min-height: 300px;
		border: 1px solid #e5e7eb;
	}

	.sessions-header {
		margin-bottom: 1.5rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-content h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.header-icon {
		width: 1.5rem;
		height: 1.5rem;
		color: #3b82f6;
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.refresh-btn:hover {
		background: #e5e7eb;
	}

	.refresh-btn svg {
		width: 1rem;
		height: 1rem;
		color: #6b7280;
	}

	.loading-indicator, .error-message, .empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: #6b7280;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
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

	.retry-btn {
		background-color: #3b82f6;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
		font-weight: 500;
	}

	.retry-btn:hover {
		background-color: #2563eb;
	}

	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.session-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background-color: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
		transition: all 0.2s ease;
	}

	.session-item:hover {
		box-shadow: 0 2px 8px rgba(0,0,0,0.1);
		border-color: #d1d5db;
	}

	.session-item.status-active {
		border-left: 4px solid #22c55e;
	}

	.session-item.status-pending {
		border-left: 4px solid #eab308;
	}

	.session-item.status-rejected {
		border-left: 4px solid #ef4444;
	}

	.session-item.status-failed {
		border-left: 4px solid #dc2626;
	}

	.session-item.status-ended {
		border-left: 4px solid #6b7280;
	}

	.session-info {
		flex: 1;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.session-id {
		font-family: monospace;
		font-weight: 600;
		color: #1f2937;
	}

	.session-status {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.session-status.status-active {
		background-color: #dcfce7;
		color: #166534;
	}

	.session-status.status-pending {
		background-color: #fef9c3;
		color: #854d0e;
	}

	.session-status.status-rejected {
		background-color: #fee2e2;
		color: #991b1b;
	}

	.session-status.status-failed {
		background-color: #fecaca;
		color: #b91c1c;
	}

	.session-status.status-ended {
		background-color: #f1f5f9;
		color: #475569;
	}

	.session-details {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.detail-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 500;
	}

	.detail-value {
		font-size: 0.875rem;
		color: #1f2937;
		font-family: monospace;
	}

	.session-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid transparent;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn svg {
		width: 14px;
		height: 14px;
	}

	.action-btn.view {
		background-color: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.action-btn.view:hover {
		background-color: #2563eb;
	}

	.action-btn.end {
		background-color: #ef4444;
		color: white;
		border-color: #ef4444;
	}

	.action-btn.end:hover {
		background-color: #dc2626;
	}

	.action-btn.pending {
		background-color: #fbbf24;
		color: white;
		border-color: #fbbf24;
		cursor: not-allowed;
	}

	.action-btn.view-only {
		background-color: #6b7280;
		color: white;
		border-color: #6b7280;
	}

	.action-btn.view-only:hover {
		background-color: #4b5563;
	}

	.last-updated {
		text-align: right;
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: 1rem;
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.session-item {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.session-actions {
			justify-content: stretch;
		}

		.action-btn {
			flex: 1;
			justify-content: center;
		}

		.session-details {
			grid-template-columns: 1fr;
		}
	}
</style> 