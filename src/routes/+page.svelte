<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';

	onMount(() => {
		// Inicializar el store de autenticación
		authStore.init();

		// Redirigir según el estado de autenticación
		if ($authStore.isAuthenticated) {
			goto('/dashboard');
		} else {
			goto('/login');
		}
	});
</script>

<svelte:head>
	<title>RemoteDesk Pro - Admin</title>
</svelte:head>

<div class="loading-page">
	<div class="loading-content">
		<div class="logo">
			<div class="logo-icon">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
					<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1"/>
					<path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/>
				</svg>
			</div>
			<h1>RemoteDesk Pro</h1>
			<p>Inicializando sistema...</p>
		</div>
		<div class="spinner-container">
			<div class="spinner"></div>
			<div class="spinner-glow"></div>
		</div>
	</div>

	<div class="background-elements">
		<div class="bg-circle bg-circle-1"></div>
		<div class="bg-circle bg-circle-2"></div>
		<div class="grid-pattern"></div>
	</div>
</div>

<style>
	.loading-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%);
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
		animation: float 8s ease-in-out infinite;
	}

	.bg-circle-1 {
		width: 300px;
		height: 300px;
		top: -150px;
		right: -150px;
		animation-delay: 0s;
	}

	.bg-circle-2 {
		width: 200px;
		height: 200px;
		bottom: -100px;
		left: -100px;
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
		50% { transform: translateY(-30px) rotate(180deg); }
	}

	@keyframes gridMove {
		0% { transform: translate(0, 0); }
		100% { transform: translate(50px, 50px); }
	}

	.loading-content {
		text-align: center;
		color: white;
		position: relative;
		z-index: 1;
		animation: fadeIn 1s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.logo {
		margin-bottom: 3rem;
	}

	.logo-icon {
		width: 80px;
		height: 80px;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		border-radius: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		margin: 0 auto 2rem;
		box-shadow: 0 10px 30px rgba(49, 130, 206, 0.4);
		animation: iconPulse 3s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% { 
			transform: scale(1);
			box-shadow: 0 10px 30px rgba(49, 130, 206, 0.4);
		}
		50% { 
			transform: scale(1.05);
			box-shadow: 0 15px 40px rgba(49, 130, 206, 0.6);
		}
	}

	.logo-icon svg {
		width: 40px;
		height: 40px;
	}

	.logo h1 {
		margin: 0 0 1rem;
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.logo p {
		margin: 0;
		opacity: 0.9;
		font-size: 1.1rem;
		font-weight: 500;
		animation: textPulse 2s ease-in-out infinite;
	}

	@keyframes textPulse {
		0%, 100% { opacity: 0.9; }
		50% { opacity: 0.6; }
	}

	.spinner-container {
		position: relative;
		width: 60px;
		height: 60px;
		margin: 0 auto;
	}

	.spinner {
		width: 60px;
		height: 60px;
		border: 3px solid rgba(255, 255, 255, 0.2);
		border-top: 3px solid #3182ce;
		border-right: 3px solid #10b981;
		border-radius: 50%;
		animation: spin 1.5s linear infinite;
		position: relative;
		z-index: 2;
	}

	.spinner-glow {
		position: absolute;
		top: -5px;
		left: -5px;
		width: 70px;
		height: 70px;
		border: 2px solid transparent;
		border-top: 2px solid rgba(49, 130, 206, 0.5);
		border-right: 2px solid rgba(16, 185, 129, 0.5);
		border-radius: 50%;
		animation: spin 2s linear infinite reverse;
		filter: blur(2px);
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.logo h1 {
			font-size: 2rem;
		}

		.logo-icon {
			width: 60px;
			height: 60px;
			border-radius: 18px;
		}

		.logo-icon svg {
			width: 30px;
			height: 30px;
		}

		.spinner-container {
			width: 50px;
			height: 50px;
		}

		.spinner {
			width: 50px;
			height: 50px;
		}

		.spinner-glow {
			width: 60px;
			height: 60px;
			top: -5px;
			left: -5px;
		}
	}
</style>
