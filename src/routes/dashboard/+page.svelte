<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';
	import { authService } from '$lib/services/authService';
	import PCList from '$lib/components/PCList.svelte';

	let backendHealthy = false;
	let healthCheckTime = '';
	let systemStats = {
		uptime: '2h 45m',
		connections: 0,
		sessions: 0,
		dataTransferred: '0 MB'
	};
	let activeTab = 'all';

	onMount(async () => {
		// Verificar estado del backend
		await checkBackendHealth();
		// Simular estadísticas del sistema
		updateSystemStats();
	});

	async function checkBackendHealth() {
		backendHealthy = await authService.checkBackendHealth();
		healthCheckTime = new Date().toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function updateSystemStats() {
		// Simular datos en tiempo real
		setInterval(() => {
			const uptimeMinutes = Math.floor(Math.random() * 300) + 165; // 2h 45m base
			const hours = Math.floor(uptimeMinutes / 60);
			const minutes = uptimeMinutes % 60;
			systemStats.uptime = `${hours}h ${minutes}m`;
		}, 30000);
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function switchTab(tab: string) {
		activeTab = tab;
	}
</script>

<svelte:head>
	<title>Dashboard - RemoteDesk Pro</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<div class="header-content">
			<div class="welcome-section">
				<h1>Dashboard Principal</h1>
				<p>Monitoreo y control del sistema de escritorio remoto</p>
			</div>
			<div class="quick-actions">
				<button class="action-btn primary" on:click={checkBackendHealth}>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
					</svg>
					Actualizar Estado
				</button>
			</div>
		</div>
	</div>

	<div class="stats-overview">
		<div class="stat-card primary">
			<div class="stat-header">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 4A4 4 0 0 1 16 8A4 4 0 0 1 12 12A4 4 0 0 1 8 8A4 4 0 0 1 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14Z"/>
					</svg>
				</div>
				<div class="stat-info">
					<h3>Usuario Activo</h3>
					<p class="stat-value">{$authStore.user?.username}</p>
					<p class="stat-label">{$authStore.user?.role}</p>
				</div>
			</div>
		</div>

		<div class="stat-card success">
			<div class="stat-header">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M11 16.5L18 9.5L16.59 8.09L11 13.67L7.91 10.59L6.5 12L11 16.5Z"/>
					</svg>
				</div>
				<div class="stat-info">
					<h3>Estado del Sistema</h3>
					<p class="stat-value {backendHealthy ? 'healthy' : 'unhealthy'}">
						{backendHealthy ? 'Operativo' : 'Desconectado'}
					</p>
					<p class="stat-label">Verificado: {healthCheckTime}</p>
				</div>
			</div>
		</div>

		<div class="stat-card info">
			<div class="stat-header">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M11 17H13V11H11V17M11 9H13V7H11V9Z"/>
					</svg>
				</div>
				<div class="stat-info">
					<h3>Tiempo Activo</h3>
					<p class="stat-value">{systemStats.uptime}</p>
					<p class="stat-label">Desde último reinicio</p>
				</div>
			</div>
		</div>

		<div class="stat-card accent">
			<div class="stat-header">
				<div class="stat-icon">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z"/>
					</svg>
				</div>
				<div class="stat-info">
					<h3>Versión</h3>
					<p class="stat-value">v1.0.0</p>
					<p class="stat-label">FASE 1 - Autenticación</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Sección de PCs Cliente -->
	<div class="pc-section">
		<div class="section-tabs">
			<h2 class="section-title">
				<svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
					<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
				</svg>
				Gestión de PCs Cliente
			</h2>
			<div class="tabs">
				<button 
					class="tab" 
					class:active={activeTab === 'all'}
					on:click={() => switchTab('all')}
				>
					Todos los PCs
				</button>
				<button 
					class="tab" 
					class:active={activeTab === 'online'}
					on:click={() => switchTab('online')}
				>
					Solo Online
				</button>
			</div>
		</div>
		
		<div class="tab-content">
			{#if activeTab === 'all'}
				<PCList showOnlineOnly={false} />
			{:else if activeTab === 'online'}
				<PCList showOnlineOnly={true} />
			{/if}
		</div>
	</div>

	<div class="main-grid">
		<div class="content-card progress-card">
			<div class="card-header">
				<h2>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"/>
					</svg>
					Progreso de Desarrollo
				</h2>
			</div>
			<div class="card-content">
				<div class="progress-overview">
					<div class="progress-stats">
						<div class="progress-item">
							<span class="progress-label">Completado</span>
							<span class="progress-percentage">16.67%</span>
						</div>
						<div class="progress-item">
							<span class="progress-label">Fases</span>
							<span class="progress-percentage">2/12</span>
						</div>
					</div>
					<div class="progress-bar">
						<div class="progress-fill" style="width: 16.67%"></div>
					</div>
				</div>

				<div class="phase-list">
					<div class="phase-item completed">
						<div class="phase-indicator">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"/>
							</svg>
						</div>
						<div class="phase-content">
							<h4>FASE 1: Autenticación del Administrador</h4>
							<p>Sistema de autenticación JWT y panel web completados</p>
							<div class="phase-features">
								<span class="feature-tag">Backend API</span>
								<span class="feature-tag">JWT Tokens</span>
								<span class="feature-tag">Admin Web</span>
							</div>
						</div>
					</div>

					<div class="phase-item active">
						<div class="phase-indicator">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 6A2 2 0 0 1 14 8A2 2 0 0 1 12 10A2 2 0 0 1 10 8A2 2 0 0 1 12 6M9 20L12 19L15 20V16C15 13.34 13.67 12 12 12S9 13.34 9 16V20Z"/>
							</svg>
						</div>
						<div class="phase-content">
							<h4>FASE 2: Cliente y Registro PC</h4>
							<p>Autenticación de usuarios cliente y registro de equipos</p>
							<div class="phase-features">
								<span class="feature-tag upcoming">Cliente Wails</span>
								<span class="feature-tag upcoming">Registro PC</span>
								<span class="feature-tag upcoming">Auth Cliente</span>
							</div>
						</div>
					</div>

					<div class="phase-item pending">
						<div class="phase-indicator">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 6A2 2 0 0 1 14 8A2 2 0 0 1 12 10A2 2 0 0 1 10 8A2 2 0 0 1 12 6M21 9V7L19 8L21 9M11 14V8H13V14H11M9 16H15V18H9V16Z"/>
							</svg>
						</div>
						<div class="phase-content">
							<h4>FASE 3: Visualización de PCs</h4>
							<p>Dashboard con lista de PCs conectados y estados</p>
							<div class="phase-features">
								<span class="feature-tag future">Lista PCs</span>
								<span class="feature-tag future">Estados Real-time</span>
								<span class="feature-tag future">Filtros</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="content-card system-card">
			<div class="card-header">
				<h2>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M4 6H20V16H4M20 18A2 2 0 0 0 22 16V6C22 4.89 21.1 4 20 4H4A2 2 0 0 0 2 6V16A2 2 0 0 0 4 18H0V20H24V18H20Z"/>
					</svg>
					Estado del Sistema
				</h2>
			</div>
			<div class="card-content">
				<div class="system-metrics">
					<div class="metric-item">
						<div class="metric-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M4 2H20A2 2 0 0 1 22 4V16A2 2 0 0 1 20 18H16L12 22L8 18H4A2 2 0 0 1 2 16V4A2 2 0 0 1 4 2M6 6H18V8H6V6M6 10H16V12H6V10M6 14H14V16H6V14Z"/>
							</svg>
						</div>
						<div class="metric-info">
							<span class="metric-label">PCs Conectados</span>
							<span class="metric-value">{systemStats.connections}</span>
						</div>
					</div>

					<div class="metric-item">
						<div class="metric-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M11 17H13V11H11V17M11 9H13V7H11V9Z"/>
							</svg>
						</div>
						<div class="metric-info">
							<span class="metric-label">Sesiones Activas</span>
							<span class="metric-value">{systemStats.sessions}</span>
						</div>
					</div>

					<div class="metric-item">
						<div class="metric-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M5 20H19V18H5M19 9H15L13 7H9C7.9 7 7 7.9 7 9V15C7 16.1 7.9 17 9 17H19C20.1 17 21 16.1 21 15V11C21 9.9 20.1 9 19 9Z"/>
							</svg>
						</div>
						<div class="metric-info">
							<span class="metric-label">Datos Transferidos</span>
							<span class="metric-value">{systemStats.dataTransferred}</span>
						</div>
					</div>
				</div>

				<div class="status-indicators">
					<div class="status-item">
						<div class="status-dot {backendHealthy ? 'online' : 'offline'}"></div>
						<span>Servidor Backend</span>
					</div>
					<div class="status-item">
						<div class="status-dot online"></div>
						<span>Base de Datos</span>
					</div>
					<div class="status-item">
						<div class="status-dot online"></div>
						<span>Cache Redis</span>
					</div>
					<div class="status-item">
						<div class="status-dot offline"></div>
						<span>Clientes Conectados</span>
					</div>
				</div>
			</div>
		</div>

		<div class="content-card features-card">
			<div class="card-header">
				<h2>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2M18 20H6V4H13V9H18V20Z"/>
					</svg>
					Próximas Funcionalidades
				</h2>
			</div>
			<div class="card-content">
				<div class="feature-list">
					<div class="feature-item">
						<div class="feature-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M4 6H20V16H4M20 18A2 2 0 0 0 22 16V6C22 4.89 21.1 4 20 4H4A2 2 0 0 0 2 6V16A2 2 0 0 0 4 18H0V20H24V18H20Z"/>
							</svg>
						</div>
						<div class="feature-content">
							<h4>Control Remoto</h4>
							<p>Acceso completo a escritorios remotos con control de mouse y teclado</p>
						</div>
					</div>

					<div class="feature-item">
						<div class="feature-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M18 16V14H6V16H18M6 10H18V8H6V10M18 4H6V6H18V4M4 8H2V6C2 4.9 2.9 4 4 4H20C21.1 4 22 4.9 22 6V8H20V6H4V8M20 10H22V14H20V10M4 10H2V14H4V10M20 16H22V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V16H4V18H20V16Z"/>
							</svg>
						</div>
						<div class="feature-content">
							<h4>Transferencia de Archivos</h4>
							<p>Envío y recepción de archivos entre servidor y clientes</p>
						</div>
					</div>

					<div class="feature-item">
						<div class="feature-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M17 10.5V7A1 1 0 0 0 16 6H4A1 1 0 0 0 3 7V17A1 1 0 0 0 4 18H16A1 1 0 0 0 17 17V13.5L21 17.5V6.5L17 10.5Z"/>
							</svg>
						</div>
						<div class="feature-content">
							<h4>Grabación de Sesiones</h4>
							<p>Grabación automática de sesiones para auditoría y revisión</p>
						</div>
					</div>

					<div class="feature-item">
						<div class="feature-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M9 17H7V10H9V17M13 17H11V7H13V17M17 17H15V13H17V17Z"/>
							</svg>
						</div>
						<div class="feature-content">
							<h4>Reportes y Análisis</h4>
							<p>Generación de informes detallados y análisis de uso</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0;
	}

	.dashboard-header {
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
		margin: -2rem -2rem 2rem -2rem;
		padding: 2rem;
		color: white;
		border-radius: 0 0 24px 24px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1400px;
		margin: 0 auto;
	}

	.welcome-section h1 {
		margin: 0 0 0.5rem;
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	.welcome-section p {
		margin: 0;
		font-size: 1.1rem;
		opacity: 0.9;
	}

	.quick-actions {
		display: flex;
		gap: 1rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 12px;
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

	.stats-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		border: 1px solid #e2e8f0;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.stat-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
	}

	.stat-card.primary::before {
		background: linear-gradient(135deg, #1a365d 0%, #3182ce 100%);
	}

	.stat-card.success::before {
		background: linear-gradient(135deg, #059669 0%, #10b981 100%);
	}

	.stat-card.info::before {
		background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
	}

	.stat-card.accent::before {
		background: linear-gradient(135deg, #6b46c1 0%, #ec4899 100%);
	}

	.stat-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		flex-shrink: 0;
	}

	.stat-card.primary .stat-icon {
		background: linear-gradient(135deg, #1a365d 0%, #3182ce 100%);
	}

	.stat-card.success .stat-icon {
		background: linear-gradient(135deg, #059669 0%, #10b981 100%);
	}

	.stat-card.info .stat-icon {
		background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
	}

	.stat-card.accent .stat-icon {
		background: linear-gradient(135deg, #6b46c1 0%, #ec4899 100%);
	}

	.stat-icon svg {
		width: 24px;
		height: 24px;
	}

	.stat-info h3 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.25rem;
		color: #1e293b;
	}

	.stat-value.healthy {
		color: #059669;
	}

	.stat-value.unhealthy {
		color: #dc2626;
	}

	.stat-label {
		margin: 0;
		font-size: 0.8rem;
		color: #64748b;
	}

	.main-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.content-card {
		background: white;
		border-radius: 16px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
	}

	.card-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid #e2e8f0;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1e293b;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.card-header svg {
		width: 20px;
		height: 20px;
		color: #3182ce;
	}

	.card-content {
		padding: 2rem;
	}

	.progress-overview {
		margin-bottom: 2rem;
	}

	.progress-stats {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.progress-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.progress-label {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.progress-percentage {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.phase-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.phase-item {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.phase-item.completed {
		background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
		border: 1px solid #bbf7d0;
	}

	.phase-item.active {
		background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
		border: 1px solid #93c5fd;
	}

	.phase-item.pending {
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border: 1px solid #e2e8f0;
	}

	.phase-indicator {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.phase-item.completed .phase-indicator {
		background: linear-gradient(135deg, #059669 0%, #10b981 100%);
		color: white;
	}

	.phase-item.active .phase-indicator {
		background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
		color: white;
	}

	.phase-item.pending .phase-indicator {
		background: #e2e8f0;
		color: #64748b;
	}

	.phase-indicator svg {
		width: 20px;
		height: 20px;
	}

	.phase-content h4 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1e293b;
	}

	.phase-content p {
		margin: 0 0 1rem;
		color: #64748b;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.phase-features {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.feature-tag {
		padding: 0.25rem 0.75rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.phase-item.completed .feature-tag {
		background: #059669;
		color: white;
	}

	.feature-tag.upcoming {
		background: #fbbf24;
		color: #92400e;
	}

	.feature-tag.future {
		background: #e2e8f0;
		color: #64748b;
	}

	.system-metrics {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.metric-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}

	.metric-icon {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.metric-icon svg {
		width: 20px;
		height: 20px;
	}

	.metric-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-label {
		font-size: 0.85rem;
		color: #64748b;
		font-weight: 500;
	}

	.metric-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.status-indicators {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		color: #1e293b;
		font-weight: 500;
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.status-dot.online {
		background: #10b981;
	}

	.status-dot.offline {
		background: #ef4444;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.features-card {
		grid-column: 1 / -1;
	}

	.feature-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.feature-item {
		display: flex;
		gap: 1rem;
		padding: 1.5rem;
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.feature-item:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.feature-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.feature-icon svg {
		width: 24px;
		height: 24px;
	}

	.feature-content h4 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1e293b;
	}

	.feature-content p {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	@media (max-width: 1024px) {
		.main-grid {
			grid-template-columns: 1fr;
		}

		.dashboard-header {
			margin: -1rem -1rem 2rem -1rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1.5rem;
			text-align: center;
		}

		.welcome-section h1 {
			font-size: 2rem;
		}
	}

	@media (max-width: 768px) {
		.stats-overview {
			grid-template-columns: 1fr;
		}

		.card-content {
			padding: 1.5rem;
		}

		.card-header {
			padding: 1rem 1.5rem;
		}

		.feature-list {
			grid-template-columns: 1fr;
		}

		.action-btn {
			padding: 0.5rem 1rem;
			font-size: 0.8rem;
		}
	}

	/* Estilos para la sección de PCs Cliente */
	.pc-section {
		margin-bottom: 2rem;
	}

	.section-tabs {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding: 0 0.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.section-icon {
		width: 1.75rem;
		height: 1.75rem;
		color: #3b82f6;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		background: #f1f5f9;
		padding: 0.25rem;
		border-radius: 0.75rem;
		border: 1px solid #e2e8f0;
	}

	.tab {
		padding: 0.75rem 1.5rem;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
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

	.tab-content {
		margin-top: 1rem;
	}

	/* Responsive para la sección de PCs */
	@media (max-width: 768px) {
		.section-tabs {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.tabs {
			width: 100%;
			justify-content: center;
		}

		.tab {
			flex: 1;
			text-align: center;
		}
	}
</style> 