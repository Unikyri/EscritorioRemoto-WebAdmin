<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { authService } from '$lib/services/authService';

	// Rutas que no requieren autenticación
	const publicRoutes = ['/login'];

	// Inicializar auth store al cargar la aplicación
	onMount(() => {
		authStore.init();
	});

	// Reactively check authentication
	$: {
		if (typeof window !== 'undefined') {
			const currentPath = $page.url.pathname;
			const isPublicRoute = publicRoutes.includes(currentPath);
			const isAuthenticated = $authStore.isAuthenticated;

			// Si no está autenticado y está en una ruta protegida, redirigir a login
			if (!isAuthenticated && !isPublicRoute) {
				goto('/login');
			}
			
			// Si está autenticado y está en login, redirigir al dashboard
			if (isAuthenticated && currentPath === '/login') {
				goto('/dashboard');
			}
		}
	}

	// Determinar si estamos en una página pública
	$: isPublicPage = publicRoutes.includes($page.url.pathname);
</script>

<svelte:head>
	<title>RemoteDesk Pro - Admin</title>
	<meta name="description" content="Panel de administración profesional del sistema de escritorio remoto" />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="app">
	{#if $authStore.isAuthenticated}
		<nav class="navbar">
			<div class="nav-container">
				<div class="nav-brand">
					<div class="logo">
						<div class="logo-icon">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
								<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/>
								<path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/>
							</svg>
						</div>
						<div class="brand-text">
							<h1>RemoteDesk</h1>
							<span class="brand-subtitle">Pro Admin</span>
						</div>
					</div>
				</div>
				
				<div class="nav-center">
					<div class="status-indicator">
						<div class="status-dot active"></div>
						<span>Sistema Activo</span>
					</div>
				</div>

				<div class="nav-actions">
					<div class="user-menu">
						<div class="user-avatar">
							<span>{$authStore.user?.username?.charAt(0).toUpperCase()}</span>
						</div>
						<div class="user-info">
							<span class="username">{$authStore.user?.username}</span>
							<span class="role">{$authStore.user?.role}</span>
						</div>
						<button 
							class="logout-btn"
							on:click={() => {
								authService.logout();
								goto('/login');
							}}
							aria-label="Cerrar Sesión"
						>
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 0 1 2 2v2h-2V4H4v16h10v-2h2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10z"/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</nav>

		<aside class="sidebar">
			<div class="sidebar-header">
				<h3>Panel de Control</h3>
			</div>
			<nav class="sidebar-nav">
				<a href="/dashboard" class="nav-item active" aria-label="Ir al Dashboard">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M13 9V3h8v6h-8zM3 13V3h8v10H3zm0 8V15h8v6H3zm10 0V11h8v10h-8z"/>
					</svg>
					<span>Dashboard</span>
				</a>
				<span class="nav-item disabled" aria-label="PCs Conectados - Disponible en próxima fase">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 2v16h16V4H4m2 2h12v2H6V6m0 4h8v2H6v-2m0 4h10v2H6v-2Z"/>
					</svg>
					<span>PCs Conectados</span>
					<span class="badge">Próximo</span>
				</span>
				<span class="nav-item disabled" aria-label="Sesiones Remotas - Disponible en próxima fase">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 2a8 8 0 0 1 8 8a8 8 0 0 1-8 8a8 8 0 0 1-8-8a8 8 0 0 1 8-8m1 3h-2v6l5.25 3.15l.75-1.23L13 11V7Z"/>
					</svg>
					<span>Sesiones Remotas</span>
					<span class="badge">Próximo</span>
				</span>
				<span class="nav-item disabled" aria-label="Transferencias - Disponible en próxima fase">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11Z"/>
					</svg>
					<span>Transferencias</span>
					<span class="badge">Próximo</span>
				</span>
			</nav>
		</aside>
	{/if}

	<main class="main-content" class:is-public={isPublicPage}>
		<slot />
	</main>

	{#if $authStore.loading}
		<div class="loading-overlay">
			<div class="loading-spinner">
				<div class="spinner-ring"></div>
				<p>Procesando...</p>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f8fafc;
		color: #1e293b;
		line-height: 1.6;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
	}

	.navbar {
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 70px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo-icon {
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
	}

	.logo-icon svg {
		width: 24px;
		height: 24px;
	}

	.brand-text h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: white;
		letter-spacing: -0.025em;
	}

	.brand-subtitle {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
	}

	.nav-center {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 25px;
		color: white;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
		animation: pulse 2s infinite;
	}

	.status-dot.active {
		background: #10b981;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.nav-actions {
		display: flex;
		align-items: center;
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #6b46c1 0%, #ec4899 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		color: white;
	}

	.username {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.role {
		font-size: 0.75rem;
		opacity: 0.8;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.logout-btn {
		width: 36px;
		height: 36px;
		border: none;
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		color: #f87171;
		transform: translateY(-1px);
	}

	.logout-btn svg {
		width: 18px;
		height: 18px;
	}

	.sidebar {
		position: fixed;
		left: 0;
		top: 70px;
		width: 280px;
		height: calc(100vh - 70px);
		background: white;
		border-right: 1px solid #e2e8f0;
		padding: 2rem 0;
		overflow-y: auto;
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.05);
	}

	.sidebar-header {
		padding: 0 2rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		margin-bottom: 1.5rem;
	}

	.sidebar-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1e293b;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0 1rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		color: #64748b;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
		position: relative;
	}

	.nav-item svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.nav-item.active {
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
	}

	.nav-item:not(.disabled):not(.active):hover {
		background: #f1f5f9;
		color: #1e293b;
		transform: translateX(4px);
	}

	.nav-item.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.badge {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		background: #fbbf24;
		color: #92400e;
		font-size: 0.7rem;
		font-weight: 600;
		border-radius: 6px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.main-content {
		flex: 1;
		margin-left: 280px;
		padding: 2rem;
		min-height: calc(100vh - 70px);
	}

	/* Estilos para páginas públicas (como login) */
	.main-content.is-public {
		margin-left: 0;
		padding: 0;
		min-height: 100vh;
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 23, 42, 0.8);
		backdrop-filter: blur(10px);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.loading-spinner {
		background: white;
		padding: 3rem;
		border-radius: 20px;
		text-align: center;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.spinner-ring {
		width: 50px;
		height: 50px;
		border: 4px solid #e2e8f0;
		border-top: 4px solid #3182ce;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1.5rem;
	}

	.loading-spinner p {
		margin: 0;
		color: #64748b;
		font-weight: 500;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 1024px) {
		.sidebar {
			transform: translateX(-100%);
			transition: transform 0.3s ease;
		}

		.main-content {
			margin-left: 0;
		}

		.nav-center {
			display: none;
		}

		.nav-container {
			padding: 0 1rem;
		}
	}

	@media (max-width: 768px) {
		.brand-text {
			display: none;
		}

		.user-info {
			display: none;
		}

		.main-content {
			padding: 1rem;
		}

		/* En móviles, las páginas públicas siguen sin padding */
		.main-content.is-public {
			padding: 0;
		}
	}
</style> 