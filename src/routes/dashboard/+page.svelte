<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { authService } from '$lib/services/authService';
	import { websocketService } from '$lib/services/websocketService';
	import { remoteSessionService } from '$lib/services/remoteSessionService';
	import PCList from '$lib/components/dashboard/PCList.svelte';
	import RemoteControlViewer from '$lib/components/dashboard/RemoteControlViewer.svelte';

	let backendHealthy = false;
	let healthCheckTime = '';
	let activeTab = 'all';
	let buttonStates = new Map<string, boolean>();

	// Estado del control remoto
	let activeSession = {
		sessionId: '',
		clientPcId: '',
		isActive: false
	};

	onMount(async () => {
		// Verificar estado del backend
		await checkBackendHealth();
		
		// Conectar WebSocket
		websocketService.connect();
		
		// Escuchar eventos de sesión aceptada
		window.addEventListener('session-accepted', handleSessionAccepted as EventListener);
	});

	onDestroy(() => {
		window.removeEventListener('session-accepted', handleSessionAccepted as EventListener);
		websocketService.disconnect();
	});

	async function checkBackendHealth() {
		backendHealthy = await authService.checkBackendHealth();
		healthCheckTime = new Date().toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function switchTab(tab: string) {
		activeTab = tab;
	}

	function handleSessionAccepted(event: Event) {
		const customEvent = event as CustomEvent;
		const { sessionId, clientPcId } = customEvent.detail;
		console.log('🎉 Session accepted in dashboard:', { sessionId, clientPcId });
		
		activeSession = {
			sessionId,
			clientPcId,
			isActive: true
		};
	}

	async function initiateRemoteControl(pc: any) {
		const loadingButton = `loading-${pc.pcId}`;
		buttonStates.set(loadingButton, true);
		buttonStates = buttonStates; // trigger reactivity

		try {
			console.log('Iniciando control remoto para:', pc.pcId);
			const response = await remoteSessionService.initiateSession(pc.pcId);
			
			if (response.success) {
				console.log('✅ Solicitud enviada exitosamente:', response);
				console.log(`📡 Solicitud de control remoto enviada a ${pc.identifier}. Esperando respuesta del cliente...`);
			} else {
				throw new Error(response.message || 'Error desconocido');
			}
		} catch (err: any) {
			console.error('Error al iniciar control remoto:', err);
			alert(`Error al iniciar control remoto: ${err.message || err}`);
		} finally {
			buttonStates.set(loadingButton, false);
			buttonStates = buttonStates;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - RemoteDesk Pro</title>
</svelte:head>

<div class="dashboard">
	<!-- Header principal -->
	<div class="dashboard-header">
		<div class="header-content">
			<div class="welcome-section">
				<h1>Control Remoto</h1>
				<p>Administración y control de equipos cliente</p>
			</div>
			<div class="quick-actions">
				<div class="status-indicator">
					<span class="status-dot {backendHealthy ? 'online' : 'offline'}"></span>
					<span class="status-text">
						{backendHealthy ? 'Servidor conectado' : 'Servidor desconectado'}
					</span>
				</div>
				<button class="action-btn primary" on:click={checkBackendHealth}>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
					</svg>
					Actualizar
				</button>
			</div>
		</div>
	</div>

	<div class="main-content">
		<!-- Panel de control remoto activo -->
		{#if activeSession.isActive}
			<div class="remote-control-section">
				<RemoteControlViewer 
					sessionId={activeSession.sessionId}
					clientPcId={activeSession.clientPcId}
				/>
			</div>
		{/if}

		<!-- Gestión de PCs Cliente -->
		<div class="pc-section" class:has-active-session={activeSession.isActive}>
			<div class="section-header">
				<h2 class="section-title">
					<svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
						<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
					</svg>
					PCs Cliente
				</h2>
				
				<div class="tabs">
					<button 
						class="tab" 
						class:active={activeTab === 'all'}
						on:click={() => switchTab('all')}
					>
						Todos
					</button>
					<button 
						class="tab" 
						class:active={activeTab === 'online'}
						on:click={() => switchTab('online')}
					>
						En línea
					</button>
				</div>
			</div>
			
			<div class="pc-list-container">
				{#if activeTab === 'all'}
					<PCList 
						showOnlineOnly={false} 
						onRemoteControl={initiateRemoteControl}
						{buttonStates}
					/>
				{:else if activeTab === 'online'}
					<PCList 
						showOnlineOnly={true} 
						onRemoteControl={initiateRemoteControl}
						{buttonStates}
					/>
				{/if}
			</div>
		</div>

		<!-- Panel de información rápida -->
		<div class="info-panel">
			<div class="info-card">
				<div class="info-header">
					<h3>Estado Actual</h3>
				</div>
				<div class="info-content">
					<div class="info-item">
						<span class="info-label">Usuario:</span>
						<span class="info-value">{$authStore.user?.username}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Rol:</span>
						<span class="info-value">{$authStore.user?.role}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Última verificación:</span>
						<span class="info-value">{healthCheckTime}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Sesión activa:</span>
						<span class="info-value {activeSession.isActive ? 'active' : 'inactive'}">
							{activeSession.isActive ? 'Sí' : 'No'}
						</span>
					</div>
				</div>
			</div>

			<div class="info-card">
				<div class="info-header">
					<h3>Guía Rápida</h3>
				</div>
				<div class="info-content">
					<div class="guide-item">
						<span class="guide-step">1.</span>
						<span class="guide-text">Selecciona un PC cliente en línea</span>
					</div>
					<div class="guide-item">
						<span class="guide-step">2.</span>
						<span class="guide-text">Haz clic en "Control Remoto"</span>
					</div>
					<div class="guide-item">
						<span class="guide-step">3.</span>
						<span class="guide-text">Espera a que el cliente acepte</span>
					</div>
					<div class="guide-item">
						<span class="guide-step">4.</span>
						<span class="guide-text">¡Controla el PC directamente aquí!</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: #f8fafc;
	}

	.dashboard-header {
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
		color: white;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.header-content {
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.welcome-section h1 {
		margin: 0 0 0.5rem;
		font-size: 2.5rem;
		font-weight: 700;
	}

	.welcome-section p {
		margin: 0;
		font-size: 1.1rem;
		opacity: 0.9;
	}

	.quick-actions {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.status-dot.online {
		background: #10b981;
	}

	.status-dot.offline {
		background: #ef4444;
	}

	.status-text {
		font-size: 0.9rem;
		font-weight: 500;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}

	.action-btn.primary {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.action-btn.primary:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	.action-btn svg {
		width: 18px;
		height: 18px;
	}

	.main-content {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		display: grid;
		gap: 2rem;
		grid-template-columns: 1fr 300px;
	}

	.remote-control-section {
		grid-column: 1 / -1;
		margin-bottom: 1rem;
	}

	.pc-section {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.pc-section.has-active-session {
		grid-column: 1;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e2e8f0;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e293b;
	}

	.section-icon {
		width: 20px;
		height: 20px;
		color: #3b82f6;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		background: #f1f5f9;
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	.tab {
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tab:hover {
		color: #3b82f6;
		background: rgba(59, 130, 246, 0.1);
	}

	.tab.active {
		background: white;
		color: #3b82f6;
		font-weight: 600;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.pc-list-container {
		padding: 0;
	}

	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.info-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.info-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
	}

	.info-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1e293b;
	}

	.info-content {
		padding: 1.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}

	.info-value {
		font-size: 0.875rem;
		color: #1e293b;
		font-weight: 600;
		font-family: monospace;
	}

	.info-value.active {
		color: #10b981;
	}

	.info-value.inactive {
		color: #64748b;
	}

	.guide-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.guide-step {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.guide-text {
		font-size: 0.875rem;
		color: #64748b;
		line-height: 1.5;
	}

	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr;
			padding: 0 1rem;
		}

		.info-panel {
			grid-row: 2;
		}

		.pc-section.has-active-session {
			grid-column: 1;
		}
	}

	@media (max-width: 768px) {
		.dashboard-header {
			padding: 1rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.welcome-section h1 {
			font-size: 2rem;
		}

		.section-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.tabs {
			width: 100%;
		}

		.tab {
			flex: 1;
			text-align: center;
		}
	}
</style>