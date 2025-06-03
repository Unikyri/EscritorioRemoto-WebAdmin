<script lang="ts">
	import { onMount } from 'svelte';
	import { authService } from '$lib/services/authService';
	import VideoViewer from '$lib/components/dashboard/VideoViewer.svelte';

	interface Recording {
		video_id: string;
		session_id: string;
		recorded_at: string;
		duration_seconds: number;
		total_frames: number;
		fps: number;
		file_size_mb: number;
		session_status: string;
	}

	interface ClientRecordings {
		client_pc_id: string;
		client_name: string;
		recordings: Recording[];
	}

	let clientRecordings: ClientRecordings[] = [];
	let selectedClient: string | null = null;
	let selectedRecording: Recording | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadRecordings();
	});

	async function loadRecordings() {
		try {
			loading = true;
			error = '';

			const response = await authService.authenticatedFetch('/admin/recordings');
			
			if (!response.ok) {
				throw new Error('Error cargando grabaciones');
			}

			const data = await response.json();
			
			if (data.success) {
				clientRecordings = data.data || [];
			} else {
				throw new Error(data.error || 'Error desconocido');
			}

		} catch (err: any) {
			console.error('Error loading recordings:', err);
			error = err.message || 'Error cargando grabaciones';
		} finally {
			loading = false;
		}
	}

	function selectClient(clientId: string) {
		selectedClient = selectedClient === clientId ? null : clientId;
		selectedRecording = null; // Reset selected recording when changing client
	}

	function selectRecording(recording: Recording) {
		selectedRecording = selectedRecording?.video_id === recording.video_id ? null : recording;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('es-ES', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>Grabaciones - RemoteDesk Pro</title>
</svelte:head>

<div class="recordings-page">
	<div class="page-header">
		<div class="header-content">
			<h1>📹 Grabaciones de Sesiones</h1>
			<p class="page-subtitle">
				Visualiza y reproduce las grabaciones de sesiones de control remoto por cliente
			</p>
		</div>
		<button class="refresh-btn" on:click={loadRecordings} disabled={loading}>
			<svg viewBox="0 0 24 24" fill="currentColor" class:spinning={loading}>
				<path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
			</svg>
			Actualizar
		</button>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Cargando grabaciones...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<h3>❌ Error</h3>
			<p>{error}</p>
			<button on:click={loadRecordings} class="retry-btn">Reintentar</button>
		</div>
	{:else if clientRecordings.length === 0}
		<div class="empty-state">
			<h3>📹 No hay grabaciones disponibles</h3>
			<p>No se encontraron grabaciones de sesiones. Las grabaciones aparecerán aquí después de finalizar sesiones de control remoto.</p>
		</div>
	{:else}
		<div class="recordings-layout">
			<!-- Lista de clientes -->
			<div class="clients-sidebar">
				<h3>👥 Clientes ({clientRecordings.length})</h3>
				<div class="clients-list">
					{#each clientRecordings as client}
						<button
							class="client-item"
							class:active={selectedClient === client.client_pc_id}
							on:click={() => selectClient(client.client_pc_id)}
						>
							<div class="client-icon">💻</div>
							<div class="client-info">
								<div class="client-name">{client.client_name}</div>
								<div class="client-stats">
									{client.recordings.length} grabación{client.recordings.length !== 1 ? 'es' : ''}
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Panel principal -->
			<div class="main-panel">
				{#if selectedClient}
					{@const clientData = clientRecordings.find(c => c.client_pc_id === selectedClient)}
					
					<div class="recordings-header">
						<h2>📊 Grabaciones de Cliente: {clientData?.client_name || selectedClient}</h2>
						<div class="recordings-stats">
							Total: {clientData?.recordings.length || 0} grabaciones
						</div>
					</div>

					<div class="recordings-grid">
						{#each clientData?.recordings || [] as recording}
							<div 
								class="recording-card"
								class:selected={selectedRecording?.video_id === recording.video_id}
								on:click={() => selectRecording(recording)}
								role="button"
								tabindex="0"
							>
								<div class="recording-thumbnail">
									<div class="play-icon">▶️</div>
								</div>
								<div class="recording-info">
									<div class="recording-title">
										Sesión {recording.session_id.slice(0, 8)}...
									</div>
									<div class="recording-details">
										<div class="detail">📅 {formatDate(recording.recorded_at)}</div>
										<div class="detail">⏱️ {formatDuration(recording.duration_seconds)}</div>
										<div class="detail">🎬 {recording.total_frames} frames</div>
										<div class="detail">📊 {recording.fps.toFixed(1)} FPS</div>
									</div>
									<div class="recording-status status-{recording.session_status.toLowerCase()}">
										{recording.session_status}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Video Player -->
					{#if selectedRecording}
						<div class="video-player-section">
							<h3>🎬 Reproduciendo Grabación</h3>
							<div class="video-player-container">
								<VideoViewer sessionId={selectedRecording.session_id} />
							</div>
						</div>
					{/if}
				{:else}
					<div class="no-client-selected">
						<h3>👈 Selecciona un cliente</h3>
						<p>Elige un cliente de la lista para ver sus grabaciones disponibles.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.recordings-page {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 2px solid #e2e8f0;
	}

	.header-content h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: #1e293b;
	}

	.page-subtitle {
		margin: 0;
		color: #64748b;
		font-size: 1.1rem;
		line-height: 1.6;
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
	}

	.refresh-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(49, 130, 206, 0.4);
	}

	.refresh-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.refresh-btn svg {
		width: 18px;
		height: 18px;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.loading-state, .error-state, .empty-state, .no-client-selected {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 16px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e2e8f0;
		border-top: 4px solid #3182ce;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	.recordings-layout {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 2rem;
		height: calc(100vh - 200px);
	}

	.clients-sidebar {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
	}

	.clients-sidebar h3 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.clients-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.client-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border: 2px solid transparent;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.client-item:hover {
		background: #e2e8f0;
		transform: translateX(4px);
	}

	.client-item.active {
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		border-color: #3182ce;
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
	}

	.client-icon {
		font-size: 1.5rem;
	}

	.client-name {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.client-stats {
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.main-panel {
		background: white;
		border-radius: 16px;
		padding: 1.5rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
		overflow-y: auto;
	}

	.recordings-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.recordings-header h2 {
		margin: 0;
		color: #1e293b;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.recordings-stats {
		color: #64748b;
		font-weight: 500;
	}

	.recordings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.recording-card {
		background: #f8fafc;
		border: 2px solid transparent;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.recording-card:hover {
		background: #e2e8f0;
		transform: translateY(-2px);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
	}

	.recording-card.selected {
		border-color: #3182ce;
		background: linear-gradient(135deg, rgba(49, 130, 206, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.2);
	}

	.recording-thumbnail {
		aspect-ratio: 16 / 9;
		background: linear-gradient(135deg, #1e293b 0%, #2d3748 100%);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
		position: relative;
		overflow: hidden;
	}

	.play-icon {
		font-size: 2rem;
		color: white;
		opacity: 0.8;
	}

	.recording-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.recording-title {
		font-weight: 600;
		color: #1e293b;
		font-size: 1rem;
	}

	.recording-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail {
		font-size: 0.85rem;
		color: #64748b;
	}

	.recording-status {
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		align-self: flex-start;
	}

	.status-ended_successfully {
		background: #dcfce7;
		color: #166534;
	}

	.status-ended_by_admin {
		background: #fef3c7;
		color: #92400e;
	}

	.status-ended_by_client {
		background: #e0e7ff;
		color: #3730a3;
	}

	.video-player-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 2px solid #e2e8f0;
	}

	.video-player-section h3 {
		margin: 0 0 1rem 0;
		color: #1e293b;
		font-size: 1.3rem;
		font-weight: 600;
	}

	.video-player-container {
		background: #000;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
	}

	.retry-btn {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.retry-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 15px rgba(49, 130, 206, 0.3);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.recordings-layout {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.clients-sidebar {
			max-height: 300px;
		}

		.recordings-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.recordings-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.recordings-grid {
			grid-template-columns: 1fr;
		}
	}
</style> 