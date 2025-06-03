<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { authService } from '$lib/services/authService';
	import { websocketService } from '$lib/services/websocketService';
	import SessionsManager from '$lib/components/dashboard/SessionsManager.svelte';

	let backendHealthy = false;
	let healthCheckTime = '';

	onMount(async () => {
		// Verificar estado del backend
		await checkBackendHealth();
		
		// Conectar WebSocket
		websocketService.connect();
	});

	async function checkBackendHealth() {
		backendHealthy = await authService.checkBackendHealth();
		healthCheckTime = new Date().toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Gestión de Sesiones - RemoteDesk Pro</title>
</svelte:head>

<div class="sessions-page">
	<!-- Header principal -->
	<div class="sessions-header">
		<div class="header-content">
			<div class="welcome-section">
				<h1>Gestión de Sesiones Remotas</h1>
				<p>Monitoreo y control de todas las sesiones de control remoto</p>
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
		<!-- Componente de gestión de sesiones -->
		<div class="sessions-section">
			<SessionsManager />
		</div>

		<!-- Panel de información -->
		<div class="info-panel">
			<div class="info-card">
				<div class="info-header">
					<h3>Estado del Usuario</h3>
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
				</div>
			</div>

			<div class="info-card">
				<div class="info-header">
					<h3>Navegación</h3>
				</div>
				<div class="info-content">
					<div class="guide-item">
						<a href="/dashboard" class="guide-link">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M13 9V3h8v6h-8zM3 13V3h8v10H3zm0 8V15h8v6H3zm10 0V11h8v10h-8z"/>
							</svg>
							<span>Volver al Dashboard</span>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.sessions-page {
		min-height: 100vh;
		background: #f8fafc;
	}

	.sessions-header {
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

	.sessions-section {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.info-card {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.info-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 1rem 1.5rem;
	}

	.info-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.info-content {
		padding: 1.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
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

	.guide-item {
		padding: 0.5rem 0;
	}

	.guide-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		text-decoration: none;
		color: #475569;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.guide-link:hover {
		background: #e2e8f0;
		border-color: #cbd5e1;
		transform: translateY(-1px);
	}

	.guide-link svg {
		width: 18px;
		height: 18px;
		color: #3b82f6;
	}

	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr;
			padding: 0 1rem;
		}

		.info-panel {
			grid-row: 2;
		}
	}

	@media (max-width: 768px) {
		.sessions-header {
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
	}
</style> 