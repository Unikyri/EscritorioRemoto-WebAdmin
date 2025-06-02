<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { remoteSessionService, type SessionStatusResponse } from '$lib/services/remoteSessionService';
	import { websocketService, type WebSocketEvent } from '$lib/services/websocketService';

	// Obtener el sessionId de la URL
	$: sessionId = $page.params.sessionId;

	// State
	let session: SessionStatusResponse | null = null;
	let loading = true;
	let error = '';
	let connectionStatus = 'Conectando...';

	onMount(() => {
		if (sessionId) {
			loadSession();
			setupWebSocketHandlers();
		} else {
			error = 'ID de sesión inválido';
			loading = false;
		}
	});

	onDestroy(() => {
		// Cleanup WebSocket handlers
		websocketService.unsubscribe('session_ended', handleSessionEvent);
		websocketService.unsubscribe('session_failed', handleSessionEvent);
	});

	async function loadSession() {
		try {
			session = await remoteSessionService.getSessionStatus(sessionId);
			
			// Verificar que la sesión está activa
			if (!session || !remoteSessionService.isSessionActive(session.status)) {
				error = 'La sesión no está activa o no existe';
				return;
			}
			
			connectionStatus = 'Conectado - Sesión activa';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al cargar la sesión';
		} finally {
			loading = false;
		}
	}

	function setupWebSocketHandlers() {
		// Escuchar eventos de sesión terminada o fallida
		websocketService.subscribe('session_ended', handleSessionEvent);
		websocketService.subscribe('session_failed', handleSessionEvent);
	}

	function handleSessionEvent(event: WebSocketEvent) {
		const sessionEvent = event.data;
		
		if (sessionEvent.session_id === sessionId) {
			if (event.type === 'session_ended') {
				connectionStatus = 'Sesión terminada';
				// Redirigir de vuelta al dashboard después de un delay
				setTimeout(() => {
					goto('/dashboard');
				}, 3000);
			} else if (event.type === 'session_failed') {
				connectionStatus = 'Error en la sesión';
				error = sessionEvent.error || 'La sesión ha fallado';
			}
		}
	}

	function handleBackToDashboard() {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Control Remoto - RemoteDesk Pro</title>
</svelte:head>

<div class="remote-control-container">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<h2>Cargando sesión de control remoto...</h2>
			<p>Estableciendo conexión con el cliente remoto</p>
		</div>
	{:else if error}
		<div class="error-state">
			<svg viewBox="0 0 24 24" fill="currentColor" class="error-icon">
				<path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z"/>
			</svg>
			<h2>Error en la conexión</h2>
			<p>{error}</p>
			<button class="back-btn" on:click={handleBackToDashboard}>
				Volver al Dashboard
			</button>
		</div>
	{:else if session}
		<div class="remote-control-header">
			<div class="session-info">
				<h1>
					<svg viewBox="0 0 24 24" fill="currentColor" class="header-icon">
						<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
					</svg>
					Control Remoto Activo
				</h1>
				<div class="session-details">
					<span class="session-id">Sesión: {sessionId}</span>
					<span class="client-id">Cliente: {session.client_pc_id}</span>
					<span class="connection-status active">{connectionStatus}</span>
				</div>
			</div>
			
			<div class="control-actions">
				<button class="control-btn secondary" on:click={handleBackToDashboard}>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
					</svg>
					Salir
				</button>
			</div>
		</div>

		<div class="remote-control-content">
			<div class="coming-soon">
				<svg viewBox="0 0 24 24" fill="currentColor" class="construction-icon">
					<path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
				</svg>
				<h2>Interfaz de Control Remoto</h2>
				<p>La funcionalidad de control remoto estará disponible en la siguiente fase.</p>
				<p>Por ahora, la sesión está establecida y activa correctamente.</p>
				
				<div class="session-summary">
					<h3>Detalles de la Sesión</h3>
					<div class="detail-grid">
						<div class="detail-item">
							<span class="label">Estado:</span>
							<span class="value status-active">{remoteSessionService.getSessionStatusText(session.status)}</span>
						</div>
						<div class="detail-item">
							<span class="label">Cliente:</span>
							<span class="value">{session.client_pc_id}</span>
						</div>
						<div class="detail-item">
							<span class="label">Inicio:</span>
							<span class="value">{session.start_time ? new Date(session.start_time).toLocaleString('es-ES') : 'N/A'}</span>
						</div>
						<div class="detail-item">
							<span class="label">Duración:</span>
							<span class="value">{session.start_time ? Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000 / 60) + ' minutos' : 'N/A'}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.remote-control-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		flex-direction: column;
	}

	.loading-state, .error-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		color: white;
		padding: 2rem;
	}

	.spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1.5rem;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.error-icon {
		width: 4rem;
		height: 4rem;
		color: #fbbf24;
		margin-bottom: 1rem;
	}

	.back-btn {
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		background: white;
		color: #667eea;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.back-btn:hover {
		background: #f3f4f6;
		transform: translateY(-1px);
	}

	.remote-control-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
	}

	.session-info h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1f2937;
	}

	.header-icon {
		width: 1.75rem;
		height: 1.75rem;
		color: #667eea;
	}

	.session-details {
		display: flex;
		gap: 1.5rem;
		font-size: 0.875rem;
	}

	.session-id, .client-id {
		color: #6b7280;
		font-family: monospace;
	}

	.connection-status {
		font-weight: 600;
	}

	.connection-status.active {
		color: #059669;
	}

	.control-actions {
		display: flex;
		gap: 0.75rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-btn.secondary {
		background: #f3f4f6;
		color: #374151;
	}

	.control-btn.secondary:hover {
		background: #e5e7eb;
		transform: translateY(-1px);
	}

	.control-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.remote-control-content {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.coming-soon {
		background: white;
		border-radius: 1rem;
		padding: 3rem;
		text-align: center;
		max-width: 600px;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.construction-icon {
		width: 4rem;
		height: 4rem;
		color: #f59e0b;
		margin-bottom: 1.5rem;
	}

	.coming-soon h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: #1f2937;
	}

	.coming-soon p {
		color: #6b7280;
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.session-summary {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.session-summary h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		text-align: left;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.detail-item .label {
		color: #6b7280;
		font-weight: 500;
	}

	.detail-item .value {
		color: #1f2937;
		font-weight: 600;
	}

	.value.status-active {
		color: #059669;
	}

	@media (max-width: 768px) {
		.remote-control-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.session-details {
			flex-direction: column;
			gap: 0.5rem;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}

		.coming-soon {
			padding: 2rem;
			margin: 1rem;
		}
	}
</style> 