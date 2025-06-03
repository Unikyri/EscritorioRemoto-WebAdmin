<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { remoteSessionService } from '$lib/services/remoteSessionService';
	import type { SessionStatusResponse } from '$lib/types/session.types';
	import { websocketService } from '$lib/services/websocketService';
	import type { WebSocketEvent } from '$lib/types/websocket.types';
	import RemoteControlViewer from '$lib/components/dashboard/RemoteControlViewer.svelte';

	// Obtener el sessionId de la URL
	$: sessionId = $page.params.sessionId;

	// State
	let session: SessionStatusResponse | null = null;
	let loading = true;
	let error = '';
	let connectionStatus = 'Conectando...';
	let isSessionActive = false;

	onMount(() => {
		if (sessionId) {
			loadSession();
			setupWebSocketHandlers();
			connectWebSocket();
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
			
			isSessionActive = true;
			connectionStatus = 'Sesión activa - Conectando WebSocket...';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al cargar la sesión';
		} finally {
			loading = false;
		}
	}

	function connectWebSocket() {
		// Conectar WebSocket para recibir frames
		if (!websocketService.isConnected()) {
			websocketService.connect();
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
				connectionStatus = 'Sesión terminada - Cerrando...';
				isSessionActive = false;
				// Redirigir inmediatamente al dashboard
				console.log('🔚 Session ended, redirecting to dashboard...');
				goto('/dashboard');
			} else if (event.type === 'session_failed') {
				connectionStatus = 'Error en la sesión';
				isSessionActive = false;
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
					Control Remoto - Sesión Activa
				</h1>
				<div class="session-details">
					<span class="session-id">Sesión: {sessionId}</span>
					<span class="client-id">Cliente: {session.client_pc_id}</span>
					<span class="connection-status {isSessionActive ? 'active' : 'inactive'}">{connectionStatus}</span>
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
			<!-- Componente de control remoto funcional -->
			<RemoteControlViewer 
				{sessionId} 
				clientPcId={session.client_pc_id}
			/>
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
		flex-shrink: 0;
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

	.connection-status.inactive {
		color: #dc2626;
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
		padding: 1rem;
		min-height: 0; /* Important for flex child to shrink */
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

		.remote-control-content {
			padding: 0.5rem;
		}
	}
</style> 