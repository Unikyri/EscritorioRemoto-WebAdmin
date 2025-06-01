<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { authService } from '$lib/services/authService';

	let username = '';
	let password = '';
	let showPassword = false;
	let backendHealthy = false;
	let rememberMe = false;

	// Verificar si ya está autenticado
	onMount(async () => {
		if ($authStore.isAuthenticated) {
			goto('/dashboard');
		}

		// Verificar conexión con backend
		backendHealthy = await authService.checkBackendHealth();
	});

	async function handleSubmit() {
		// Validaciones básicas
		if (!username.trim()) {
			authStore.setError('Por favor ingrese su nombre de usuario');
			return;
		}

		if (!password.trim()) {
			authStore.setError('Por favor ingrese su contraseña');
			return;
		}

		try {
			await authService.login(username.trim(), password);
			// El store ya maneja la redirección a través del layout
		} catch (error) {
			// El error ya se maneja en el servicio y se muestra en la UI
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<svelte:head>
	<title>Iniciar Sesión - RemoteDesk Pro</title>
</svelte:head>

<div class="login-container">
	<div class="login-wrapper">
		<div class="login-card">
			<div class="login-header">
				<div class="logo">
					<div class="logo-icon">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
							<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/>
							<path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/>
						</svg>
					</div>
					<div class="brand-info">
						<h1>RemoteDesk Pro</h1>
						<p class="subtitle">Panel de Administración</p>
					</div>
				</div>
			</div>

			<div class="login-body">
				<div class="welcome-section">
					<h2>Bienvenido de vuelta</h2>
					<p>Inicie sesión para acceder al panel de administración</p>
				</div>

				{#if !backendHealthy}
					<div class="alert alert-warning">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z"/>
						</svg>
						<div class="alert-content">
							<strong>Servidor Desconectado</strong>
							<p>No se puede conectar con el backend en http://localhost:8080</p>
						</div>
					</div>
				{/if}

				{#if $authStore.error}
					<div class="alert alert-error">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M13 14H11V10H13M13 18H11V16H13M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2Z"/>
						</svg>
						<div class="alert-content">
							<strong>Error de autenticación</strong>
							<p>{$authStore.error}</p>
						</div>
					</div>
				{/if}

				<form on:submit|preventDefault={handleSubmit} class="login-form">
					<div class="form-group">
						<label for="username">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 4A4 4 0 0 1 16 8A4 4 0 0 1 12 12A4 4 0 0 1 8 8A4 4 0 0 1 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14Z"/>
							</svg>
							Usuario
						</label>
						<input
							id="username"
							type="text"
							bind:value={username}
							on:keydown={handleKeyDown}
							placeholder="Ingrese su nombre de usuario"
							disabled={$authStore.loading}
							autocomplete="username"
							class="form-input"
							class:error={$authStore.error && !username.trim()}
						/>
					</div>

					<div class="form-group">
						<label for="password">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 17A2 2 0 0 0 14 15C14 13.89 13.1 13 12 13A2 2 0 0 0 10 15A2 2 0 0 0 12 17M18 8A2 2 0 0 1 20 10V20A2 2 0 0 1 18 22H6A2 2 0 0 1 4 20V10C4 8.89 4.9 8 6 8H7V6A5 5 0 0 1 12 1A5 5 0 0 1 17 6V8H18M12 3A3 3 0 0 0 9 6V8H15V6A3 3 0 0 0 12 3Z"/>
							</svg>
							Contraseña
						</label>
						<div class="password-field">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								on:keydown={handleKeyDown}
								placeholder="Ingrese su contraseña"
								disabled={$authStore.loading}
								autocomplete="current-password"
								class="form-input"
								class:error={$authStore.error && !password.trim()}
							/>
							<button
								type="button"
								class="password-toggle"
								on:click={() => showPassword = !showPassword}
								disabled={$authStore.loading}
								title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							>
								{#if showPassword}
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M11.83 9L15 12.16V12A3 3 0 0 0 12 9H11.83M7.53 9.8L9.08 11.35C9.03 11.56 9 11.77 9 12A3 3 0 0 0 12 15C12.22 15 12.44 14.97 12.65 14.92L14.2 16.47C13.53 16.8 12.79 17 12 17A5 5 0 0 1 7 12C7 11.21 7.2 10.47 7.53 9.8M2 4.27L4.28 6.55L4.73 7L9.73 12L12.5 14.73L16.46 18.69L20.73 23L22 21.73L20.73 20.46L19.46 19.19L14.9 14.63C14.96 14.43 15 14.22 15 14A3 3 0 0 0 12 11C11.78 11 11.57 11.04 11.37 11.1L8.1 7.83C9.3 7.31 10.62 7 12 7A5 5 0 0 1 17 12C17 12.79 16.8 13.53 16.47 14.2L17.73 15.46C18.5 14.33 19 12.96 19 11.5C19 8 15.5 5 12 5C10.54 5 9.17 5.5 8.04 6.27L2 0.27L3.27 2L2 4.27Z"/>
									</svg>
								{:else}
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 9A3 3 0 0 0 9 12A3 3 0 0 0 12 15A3 3 0 0 0 15 12A3 3 0 0 0 12 9M12 17A5 5 0 0 1 7 12A5 5 0 0 1 12 7A5 5 0 0 1 17 12A5 5 0 0 1 12 17M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5S21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5Z"/>
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<div class="form-options">
						<label class="checkbox-container">
							<input type="checkbox" bind:checked={rememberMe} disabled={$authStore.loading}>
							<span class="checkmark"></span>
							Recordar sesión
						</label>
					</div>

					<button
						type="submit"
						class="login-btn"
						disabled={$authStore.loading || !username.trim() || !password.trim()}
					>
						{#if $authStore.loading}
							<span class="loading-content">
								<div class="btn-spinner"></div>
								Iniciando sesión...
							</span>
						{:else}
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M10 17V14H3V10H10V7L15 12L10 17M10 2H19A2 2 0 0 1 21 4V20A2 2 0 0 1 19 22H10A2 2 0 0 1 8 20V18H10V20H19V4H10V6H8V4A2 2 0 0 1 10 2Z"/>
							</svg>
							Iniciar Sesión
						{/if}
					</button>
				</form>

				<div class="login-footer">
					<div class="demo-credentials">
						<div class="demo-header">
							<svg viewBox="0 0 24 24" fill="currentColor">
								<path d="M11 17H13V11H11V17M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M11 7H13V9H11V7Z"/>
							</svg>
							<span>Credenciales de Demostración</span>
						</div>
						<div class="demo-content">
							<div class="credential-item">
								<span class="label">Usuario:</span>
								<code>admin</code>
							</div>
							<div class="credential-item">
								<span class="label">Contraseña:</span>
								<code>password</code>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="background-elements">
		<div class="bg-circle bg-circle-1"></div>
		<div class="bg-circle bg-circle-2"></div>
		<div class="bg-circle bg-circle-3"></div>
		<div class="grid-pattern"></div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%);
		padding: 2rem;
		position: relative;
		overflow: hidden;
	}

	.background-elements {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 0;
	}

	.bg-circle {
		position: absolute;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(49, 130, 206, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
		animation: float 6s ease-in-out infinite;
	}

	.bg-circle-1 {
		width: 400px;
		height: 400px;
		top: -200px;
		right: -200px;
		animation-delay: 0s;
	}

	.bg-circle-2 {
		width: 300px;
		height: 300px;
		bottom: -150px;
		left: -150px;
		animation-delay: 2s;
	}

	.bg-circle-3 {
		width: 200px;
		height: 200px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation-delay: 4s;
	}

	.grid-pattern {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: 
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 50px 50px;
		animation: gridMove 20s linear infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0px) rotate(0deg); }
		50% { transform: translateY(-20px) rotate(180deg); }
	}

	@keyframes gridMove {
		0% { transform: translate(0, 0); }
		100% { transform: translate(50px, 50px); }
	}

	.login-wrapper {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 480px;
	}

	.login-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
		animation: slideUp 0.6s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(50px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.login-header {
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
		padding: 2.5rem 2rem;
		text-align: center;
		position: relative;
		overflow: hidden;
	}

	.login-header::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
		animation: shimmer 3s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% { transform: translateX(-100%); }
		50% { transform: translateX(100%); }
	}

	.logo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.logo-icon {
		width: 60px;
		height: 60px;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		box-shadow: 0 8px 25px rgba(49, 130, 206, 0.4);
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.logo-icon svg {
		width: 32px;
		height: 32px;
	}

	.brand-info h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		font-weight: 700;
		color: white;
		letter-spacing: -0.025em;
	}

	.subtitle {
		margin: 0;
		color: rgba(255, 255, 255, 0.8);
		font-size: 1rem;
		font-weight: 500;
	}

	.login-body {
		padding: 2.5rem 2rem;
	}

	.welcome-section {
		text-align: center;
		margin-bottom: 2rem;
	}

	.welcome-section h2 {
		margin: 0 0 0.5rem;
		font-size: 1.75rem;
		font-weight: 600;
		color: #1e293b;
	}

	.welcome-section p {
		margin: 0;
		color: #64748b;
		font-size: 1rem;
	}

	.alert {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.alert svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.alert-content strong {
		display: block;
		margin-bottom: 0.25rem;
		font-weight: 600;
	}

	.alert-content p {
		margin: 0;
	}

	.alert-error {
		background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
		border: 1px solid #fecaca;
		color: #b91c1c;
	}

	.alert-warning {
		background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
		border: 1px solid #fed7aa;
		color: #d97706;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		font-weight: 600;
		color: #374151;
		font-size: 0.9rem;
	}

	.form-group label svg {
		width: 16px;
		height: 16px;
		color: #6b7280;
	}

	.form-input {
		width: 100%;
		padding: 0.875rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		font-size: 1rem;
		transition: all 0.2s ease;
		background: #f9fafb;
		color: #111827;
	}

	.form-input:focus {
		outline: none;
		border-color: #3182ce;
		box-shadow: 0 0 0 4px rgba(49, 130, 206, 0.1);
		background: white;
	}

	.form-input:disabled {
		background-color: #f3f4f6;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.form-input.error {
		border-color: #ef4444;
		box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
	}

	.password-field {
		position: relative;
	}

	.password-toggle {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 8px;
		transition: background-color 0.2s ease;
		color: #6b7280;
	}

	.password-toggle:hover:not(:disabled) {
		background-color: #f3f4f6;
		color: #374151;
	}

	.password-toggle svg {
		width: 18px;
		height: 18px;
	}

	.form-options {
		margin-bottom: 2rem;
	}

	.checkbox-container {
		display: flex;
		align-items: center;
		cursor: pointer;
		font-size: 0.9rem;
		color: #4b5563;
		user-select: none;
	}

	.checkbox-container input {
		position: absolute;
		opacity: 0;
		cursor: pointer;
		height: 0;
		width: 0;
	}

	.checkmark {
		height: 18px;
		width: 18px;
		background: #f9fafb;
		border: 2px solid #d1d5db;
		border-radius: 4px;
		margin-right: 0.75rem;
		position: relative;
		transition: all 0.2s ease;
	}

	.checkbox-container:hover .checkmark {
		border-color: #3182ce;
	}

	.checkbox-container input:checked ~ .checkmark {
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		border-color: #3182ce;
	}

	.checkmark:after {
		content: "";
		position: absolute;
		display: none;
		left: 5px;
		top: 2px;
		width: 4px;
		height: 8px;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}

	.checkbox-container input:checked ~ .checkmark:after {
		display: block;
	}

	.login-btn {
		width: 100%;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #1a365d 0%, #3182ce 100%);
		color: white;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.4);
		margin-bottom: 2rem;
	}

	.login-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(49, 130, 206, 0.5);
		background: linear-gradient(135deg, #2c5282 0%, #2563eb 100%);
	}

	.login-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.login-btn svg {
		width: 18px;
		height: 18px;
	}

	.loading-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.login-footer {
		border-top: 1px solid #e5e7eb;
		padding-top: 1.5rem;
	}

	.demo-credentials {
		background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 1.25rem;
	}

	.demo-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		color: #475569;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.demo-header svg {
		width: 16px;
		height: 16px;
	}

	.demo-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.credential-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.label {
		color: #64748b;
		font-weight: 500;
		min-width: 80px;
	}

	code {
		background: #e2e8f0;
		color: #475569;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.025em;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 640px) {
		.login-container {
			padding: 1rem;
		}

		.login-header {
			padding: 2rem 1.5rem;
		}

		.login-body {
			padding: 2rem 1.5rem;
		}

		.brand-info h1 {
			font-size: 1.75rem;
		}

		.welcome-section h2 {
			font-size: 1.5rem;
		}

		.demo-content {
			gap: 0.5rem;
		}

		.credential-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.label {
			min-width: auto;
		}
	}
</style> 