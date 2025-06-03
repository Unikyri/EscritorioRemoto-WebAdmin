<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { authService } from '$lib/services/authService';

	// Props
	export let sessionId: string;

	// Estado de la reproducción
	let currentFrame = 0;
	let totalFrames = 0;
	let fps = 15;
	let durationSeconds = 0;
	let isPlaying = false;
	let playbackSpeed = 1.0;
	let isLoading = true;
	let error = '';

	// Referencias DOM
	let imageElement: HTMLImageElement;
	let timelineElement: HTMLInputElement;

	// Intervalos y timeouts
	let playInterval: ReturnType<typeof setInterval> | null = null;

	// Metadatos de la grabación
	let videoMetadata: any = null;

	onMount(async () => {
		await loadVideoMetadata();
	});

	onDestroy(() => {
		if (playInterval) {
			clearInterval(playInterval);
		}
		
		// Limpiar URLs de blob para evitar memory leaks
		if (imageElement && imageElement.src.startsWith('blob:')) {
			URL.revokeObjectURL(imageElement.src);
		}
	});

	// Cargar metadatos del video
	async function loadVideoMetadata() {
		isLoading = true;
		error = '';

		try {
			const response = await authService.authenticatedFetch(`/admin/sessions/${sessionId}/recording/metadata`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Error al cargar metadatos');
			}

			const data = await response.json();
			
			if (data.success && data.data) {
				videoMetadata = data.data;
				totalFrames = data.data.total_frames || 0;
				durationSeconds = data.data.duration_seconds || 0;
				fps = data.data.fps || 15;

				// Cargar primer frame
				if (totalFrames > 0) {
					currentFrame = 0;
					await updateFrameImage();
				}
			} else {
				error = 'No se encontraron metadatos de grabación para esta sesión';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error cargando metadatos del video';
			console.error('Error loading video metadata:', err);
		} finally {
			isLoading = false;
		}
	}

	// Actualizar imagen del frame actual
	async function updateFrameImage() {
		if (imageElement && totalFrames > 0) {
			try {
				// Usar authenticatedFetch para obtener el frame con headers de autorización
				const response = await authService.authenticatedFetch(`/admin/sessions/${sessionId}/frames/${currentFrame}`);
				
				if (!response.ok) {
					console.error(`Error loading frame ${currentFrame}:`, response.status);
					return;
				}

				// Convertir la respuesta a blob y crear una URL de objeto
				const blob = await response.blob();
				const imageUrl = URL.createObjectURL(blob);
				
				// Limpiar URL anterior si existe
				if (imageElement.src.startsWith('blob:')) {
					URL.revokeObjectURL(imageElement.src);
				}
				
				// Asignar nueva imagen
				imageElement.src = imageUrl;
			} catch (err) {
				console.error(`Failed to load frame ${currentFrame}:`, err);
			}
		}
	}

	// Reproducir/pausar
	function togglePlayback() {
		if (isPlaying) {
			pause();
		} else {
			play();
		}
	}

	// Iniciar reproducción
	function play() {
		if (currentFrame >= totalFrames - 1) {
			currentFrame = 0; // Reiniciar si llegamos al final
		}

		isPlaying = true;
		
		const frameDelay = (1000 / fps) / playbackSpeed;
		
		playInterval = setInterval(async () => {
			if (currentFrame < totalFrames - 1) {
				currentFrame++;
				await updateFrameImage();
				updateTimeline();
			} else {
				pause(); // Pausar al llegar al final
			}
		}, frameDelay);
	}

	// Pausar reproducción
	function pause() {
		isPlaying = false;
		if (playInterval) {
			clearInterval(playInterval);
			playInterval = null;
		}
	}

	// Ir al frame anterior
	async function previousFrame() {
		if (currentFrame > 0) {
			currentFrame--;
			await updateFrameImage();
			updateTimeline();
		}
	}

	// Ir al frame siguiente
	async function nextFrame() {
		if (currentFrame < totalFrames - 1) {
			currentFrame++;
			await updateFrameImage();
			updateTimeline();
		}
	}

	// Cambiar velocidad de reproducción
	function setPlaybackSpeed(speed: number) {
		playbackSpeed = speed;
		
		// Reiniciar reproducción con nueva velocidad si está reproduciéndose
		if (isPlaying) {
			pause();
			play();
		}
	}

	// Ir al inicio
	async function goToStart() {
		currentFrame = 0;
		await updateFrameImage();
		updateTimeline();
	}

	// Ir al final
	async function goToEnd() {
		currentFrame = totalFrames - 1;
		await updateFrameImage();
		updateTimeline();
	}

	// Manejar cambio en la línea de tiempo
	async function onTimelineChange() {
		if (timelineElement) {
			currentFrame = parseInt(timelineElement.value);
			await updateFrameImage();
		}
	}

	// Actualizar línea de tiempo
	function updateTimeline() {
		if (timelineElement) {
			timelineElement.value = currentFrame.toString();
		}
	}

	// Formatear tiempo en mm:ss
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Calcular tiempo actual basado en el frame
	function getCurrentTime(): number {
		if (fps > 0) {
			return currentFrame / fps;
		}
		return 0;
	}

	// Manejar error de carga de imagen
	function onImageError() {
		console.error('Error loading frame:', currentFrame);
		// Podrías mostrar una imagen de placeholder aquí
	}
</script>

<div class="video-viewer">
	{#if isLoading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Cargando grabación...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<svg viewBox="0 0 24 24" fill="currentColor" class="error-icon">
				<path d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"/>
			</svg>
			<p>{error}</p>
			<button on:click={loadVideoMetadata} class="retry-btn">Reintentar</button>
		</div>
	{:else if totalFrames === 0}
		<div class="no-frames-state">
			<svg viewBox="0 0 24 24" fill="currentColor" class="no-video-icon">
				<path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
			</svg>
			<p>No hay frames disponibles para esta sesión</p>
		</div>
	{:else}
		<!-- Área de video -->
		<div class="video-area">
			<img 
				bind:this={imageElement}
				alt="Frame {currentFrame + 1} de {totalFrames}"
				class="video-frame"
				on:error={onImageError}
			/>
			
			<!-- Superposición de controles -->
			<div class="video-overlay">
				<div class="frame-info">
					Frame {currentFrame + 1} / {totalFrames}
				</div>
			</div>
		</div>

		<!-- Controles de reproducción -->
		<div class="controls">
			<!-- Timeline -->
			<div class="timeline-container">
				<span class="time-display">{formatTime(getCurrentTime())}</span>
				<input 
					bind:this={timelineElement}
					type="range" 
					min="0" 
					max={totalFrames - 1} 
					value={currentFrame}
					class="timeline"
					on:input={onTimelineChange}
				/>
				<span class="time-display">{formatTime(durationSeconds)}</span>
			</div>

			<!-- Botones de control -->
			<div class="control-buttons">
				<!-- Ir al inicio -->
				<button on:click={goToStart} class="control-btn" title="Ir al inicio">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M6,18V6H8V18H6M9.5,12L18,6V18L9.5,12Z"/>
					</svg>
				</button>

				<!-- Frame anterior -->
				<button on:click={previousFrame} class="control-btn" title="Frame anterior">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M11.5,12L20,18V6M11,18V6L2.5,12L11,18Z"/>
					</svg>
				</button>

				<!-- Reproducir/Pausar -->
				<button on:click={togglePlayback} class="control-btn play-btn" title={isPlaying ? 'Pausar' : 'Reproducir'}>
					{#if isPlaying}
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
						</svg>
					{/if}
				</button>

				<!-- Frame siguiente -->
				<button on:click={nextFrame} class="control-btn" title="Frame siguiente">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M13,6V18L21.5,12M4,18L12.5,12L4,6V18Z"/>
					</svg>
				</button>

				<!-- Ir al final -->
				<button on:click={goToEnd} class="control-btn" title="Ir al final">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M16,18H18V6H16V18M6,18L14.5,12L6,6V18Z"/>
					</svg>
				</button>
			</div>

			<!-- Controles de velocidad -->
			<div class="speed-controls">
				<span class="speed-label">Velocidad:</span>
				<button 
					on:click={() => setPlaybackSpeed(0.5)} 
					class="speed-btn {playbackSpeed === 0.5 ? 'active' : ''}"
				>
					0.5x
				</button>
				<button 
					on:click={() => setPlaybackSpeed(1.0)} 
					class="speed-btn {playbackSpeed === 1.0 ? 'active' : ''}"
				>
					1x
				</button>
				<button 
					on:click={() => setPlaybackSpeed(2.0)} 
					class="speed-btn {playbackSpeed === 2.0 ? 'active' : ''}"
				>
					2x
				</button>
			</div>
		</div>

		<!-- Información del video -->
		{#if videoMetadata}
			<div class="video-info">
				<div class="info-item">
					<span class="info-label">Duración:</span>
					<span class="info-value">{formatTime(durationSeconds)}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Frames:</span>
					<span class="info-value">{totalFrames}</span>
				</div>
				<div class="info-item">
					<span class="info-label">FPS:</span>
					<span class="info-value">{fps.toFixed(1)}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Tamaño:</span>
					<span class="info-value">{videoMetadata.file_size_mb?.toFixed(1) || 'N/A'} MB</span>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.video-viewer {
		background-color: #000;
		border-radius: 8px;
		overflow: hidden;
		max-width: 100%;
	}

	.loading-state, .error-state, .no-frames-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: #6b7280;
		background-color: #f9fafb;
		text-align: center;
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

	.error-icon, .no-video-icon {
		width: 48px;
		height: 48px;
		margin-bottom: 1rem;
		color: #ef4444;
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
		margin-top: 1rem;
	}

	.retry-btn:hover {
		background-color: #2563eb;
	}

	.video-area {
		position: relative;
		background-color: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.video-frame {
		max-width: 100%;
		max-height: 70vh;
		object-fit: contain;
		display: block;
	}

	.video-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		background: linear-gradient(
			to bottom,
			rgba(0,0,0,0.7) 0%,
			transparent 20%,
			transparent 80%,
			rgba(0,0,0,0.7) 100%
		);
	}

	.frame-info {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background-color: rgba(0,0,0,0.8);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: monospace;
	}

	.controls {
		background-color: #f9fafb;
		padding: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.timeline-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.timeline {
		flex: 1;
		height: 6px;
		background: #e5e7eb;
		border-radius: 3px;
		outline: none;
		cursor: pointer;
		-webkit-appearance: none;
	}

	.timeline::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
	}

	.timeline::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.time-display {
		font-family: monospace;
		font-size: 0.875rem;
		color: #6b7280;
		min-width: 40px;
		text-align: center;
	}

	.control-buttons {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s;
	}

	.control-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.control-btn svg {
		width: 20px;
		height: 20px;
		color: #374151;
	}

	.play-btn {
		width: 50px;
		height: 50px;
		background: #3b82f6;
		border-color: #3b82f6;
	}

	.play-btn:hover {
		background: #2563eb;
		border-color: #2563eb;
	}

	.play-btn svg {
		color: white;
		width: 24px;
		height: 24px;
	}

	.speed-controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.speed-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-right: 0.5rem;
	}

	.speed-btn {
		padding: 0.25rem 0.75rem;
		background: #fff;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.speed-btn:hover {
		background: #f3f4f6;
	}

	.speed-btn.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.video-info {
		display: flex;
		justify-content: space-around;
		padding: 1rem;
		background-color: #f9fafb;
		border-top: 1px solid #e5e7eb;
		font-size: 0.875rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.info-label {
		color: #6b7280;
		font-weight: 500;
	}

	.info-value {
		color: #1f2937;
		font-weight: 600;
	}
</style> 