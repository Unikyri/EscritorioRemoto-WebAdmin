<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { remoteSessionService } from '$lib/services/remoteSessionService'; // Mantener si los tipos se mueven después
	import { websocketService } from '$lib/services/websocketService'; // Mantener si los tipos se mueven después
	import { authService } from '$lib/services/authService'; // Agregar importación
	import FileTransferModal from './FileTransferModal.svelte';

	export let sessionId: string = '';
	export let clientPcId: string = '';
	export let isExpanded: boolean = false;

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let screenFrameCleanup: (() => void) | null = null;
	let lastFrameTime = 0;
	let frameCount = 0;
	let fps = 0;
	let isReceivingFrames = false;
	let showFileTransferModal = false;
	let recentTransfers: Array<{transferId: string, fileName: string, status: string}> = [];

	$: if (canvas && !ctx) {
		ctx = canvas.getContext('2d');
	}

	onMount(() => {
		console.log('🖥️ Remote Control Viewer mounted for session:', sessionId);
		setupScreenFrameListener();
		
		// Calcular FPS cada segundo
		const fpsInterval = setInterval(() => {
			fps = frameCount;
			frameCount = 0;
		}, 1000);

		return () => {
			clearInterval(fpsInterval);
		};
	});

	onDestroy(() => {
		if (screenFrameCleanup) {
			screenFrameCleanup();
		}
	});

	function setupScreenFrameListener() {
		screenFrameCleanup = remoteSessionService.setupScreenFrameListener((frameData) => {
			// Solo procesar frames de nuestra sesión
			if (frameData.session_id === sessionId) {
				displayFrame(frameData);
				isReceivingFrames = true;
				frameCount++;
			}
		});
	}

	function displayFrame(frameData: any) {
		if (!canvas || !ctx) return;

		try {
			// Ajustar tamaño del canvas al frame
			if (canvas.width !== frameData.width || canvas.height !== frameData.height) {
				canvas.width = frameData.width;
				canvas.height = frameData.height;
			}

			// Crear imagen desde los datos del frame
			const img = new Image();
			img.onload = () => {
				ctx!.clearRect(0, 0, canvas.width, canvas.height);
				ctx!.drawImage(img, 0, 0);
				lastFrameTime = Date.now();
			};

			// Los datos pueden venir como base64 o ArrayBuffer
			if (typeof frameData.frame_data === 'string') {
				img.src = `data:image/${frameData.format || 'jpeg'};base64,${frameData.frame_data}`;
			} else if (frameData.frame_data instanceof Uint8Array) {
				const blob = new Blob([frameData.frame_data], { type: `image/${frameData.format || 'jpeg'}` });
				img.src = URL.createObjectURL(blob);
			}
		} catch (error) {
			console.error('Error displaying frame:', error);
		}
	}

	function handleCanvasClick(event: MouseEvent) {
		if (!isReceivingFrames) return;

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		
		const x = (event.clientX - rect.left) * scaleX;
		const y = (event.clientY - rect.top) * scaleY;

		// Enviar comando de click
		const inputCommand = {
			session_id: sessionId,
			timestamp: Date.now(),
			event_type: 'mouse' as const,
			action: 'click',
			payload: {
				x: Math.round(x),
				y: Math.round(y),
				button: 'left' as const
			}
		};

		websocketService.sendInputCommand(inputCommand);
		console.log('🖱️ Mouse click sent:', x, y);
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	function openFileTransferModal() {
		showFileTransferModal = true;
	}

	function handleTransferCompleted(event: CustomEvent) {
		const { transferId, fileName, status } = event.detail;
		
		// Agregar a transferencias recientes
		recentTransfers = [
			{ transferId, fileName, status },
			...recentTransfers.slice(0, 4) // Mantener máximo 5 transferencias
		];

		console.log('✅ File transfer completed:', { transferId, fileName, status });
		
		// Opcional: Mostrar notificación toast
		// TODO: Implementar sistema de notificaciones
	}

	async function endSession() {
		if (!sessionId) {
			console.error('No session ID to end');
			return;
		}

		try {
			console.log('🔚 Ending session:', sessionId);
			
			// Usar authService en lugar de acceder directamente a localStorage
			const authHeaders = authService.getAuthHeader();
			
			const response = await fetch(`http://localhost:8080/api/admin/sessions/${sessionId}/end`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders
				}
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Error al finalizar sesión');
			}

			const result = await response.json();
			console.log('✅ Session ended successfully:', result);
			
			// La UI se actualizará automáticamente cuando llegue el evento session_ended
			
		} catch (error) {
			console.error('Error ending session:', error);
			const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
			alert(`Error al finalizar sesión: ${errorMessage}`);
		}
	}
</script>

<div class="remote-control-viewer" class:expanded={isExpanded}>
	<div class="viewer-header">
		<div class="session-info">
			<h3>Control Remoto Activo</h3>
			<div class="session-details">
				<span class="session-id">Sesión: {sessionId.substring(0, 8)}...</span>
				<span class="client-info">PC: {clientPcId.substring(0, 8)}...</span>
				<div class="status-indicators">
					<span class="status-dot" class:active={isReceivingFrames}></span>
					<span class="fps-counter">{fps} FPS</span>
				</div>
			</div>
		</div>
		
		<div class="viewer-controls">
			<!-- Botón de Transferencia de Archivos -->
			<button 
				class="control-btn" 
				on:click={openFileTransferModal} 
				title="Transferir Archivo"
				aria-label="Transferir Archivo"
				disabled={!sessionId || !clientPcId}
			>
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z M15,13V17H13V13H10.5L14,9.5L17.5,13H15Z"/>
				</svg>
			</button>

			<button class="control-btn" on:click={toggleExpanded} title={isExpanded ? 'Contraer' : 'Expandir'}>
				<svg viewBox="0 0 24 24" fill="currentColor">
					{#if isExpanded}
						<path d="M4 8L8 4M4 8V4M4 8H8M20 8L16 4M20 8V4M20 8H16M4 16L8 20M4 16V20M4 16H8M20 16L16 20M20 16V20M20 16H16"/>
					{:else}
						<path d="M8 3H5C3.9 3 3 3.9 3 5V8H5V5H8V3M19 3H16V5H19V8H21V5C21 3.9 20.1 3 19 3M5 16H3V19C3 20.1 3.9 21 5 21H8V19H5V16M21 16H19V19H16V21H19C20.1 21 21 20.1 21 19V16Z"/>
					{/if}
				</svg>
			</button>
			
			<button class="control-btn danger" on:click={endSession} title="Finalizar Sesión" aria-label="Finalizar Sesión">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
				</svg>
			</button>
		</div>
	</div>

	<div class="viewer-content">
		{#if sessionId}
			<div class="canvas-container">
				<canvas 
					bind:this={canvas}
					on:click={handleCanvasClick}
					class="screen-canvas"
				></canvas>
				
				{#if !isReceivingFrames}
					<div class="loading-overlay">
						<div class="loading-spinner"></div>
						<p>Esperando transmisión del cliente...</p>
					</div>
				{/if}

				<!-- Indicador de transferencias recientes -->
				{#if recentTransfers.length > 0}
					<div class="transfers-indicator">
						<h4>Transferencias recientes:</h4>
						{#each recentTransfers as transfer}
							<div class="transfer-item" class:completed={transfer.status === 'COMPLETED'} 
								 class:failed={transfer.status === 'FAILED'} class:pending={transfer.status === 'PENDING'}>
								<span class="transfer-name">{transfer.fileName}</span>
								<span class="transfer-status">{transfer.status}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="no-session">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
				</svg>
				<h3>Sin sesión activa</h3>
				<p>Inicia una sesión de control remoto para ver la transmisión aquí</p>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de Transferencia de Archivos -->
<FileTransferModal 
	bind:isOpen={showFileTransferModal}
	{sessionId}
	{clientPcId}
	on:transfer-completed={handleTransferCompleted}
	on:close={() => showFileTransferModal = false}
/>

<style>
	.remote-control-viewer {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.remote-control-viewer.expanded {
		position: fixed;
		top: 20px;
		left: 20px;
		right: 20px;
		bottom: 20px;
		z-index: 1000;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}

	.viewer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
		color: white;
	}

	.session-info h3 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.session-details {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.85rem;
		opacity: 0.9;
	}

	.session-id, .client-info {
		background: rgba(255, 255, 255, 0.15);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: monospace;
	}

	.status-indicators {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
		transition: background 0.3s ease;
	}

	.status-dot.active {
		background: #10b981;
		animation: pulse 2s infinite;
	}

	.fps-counter {
		font-family: monospace;
		font-size: 0.8rem;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.viewer-controls {
		display: flex;
		gap: 0.5rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.15);
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.05);
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.control-btn.danger:hover:not(:disabled) {
		background: #ef4444;
	}

	.control-btn svg {
		width: 18px;
		height: 18px;
	}

	.viewer-content {
		height: 400px;
		position: relative;
	}

	.remote-control-viewer.expanded .viewer-content {
		height: calc(100vh - 140px);
	}

	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a1a;
	}

	.screen-canvas {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		cursor: crosshair;
		border-radius: 4px;
	}

	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(26, 26, 26, 0.9);
		color: white;
		gap: 1rem;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.loading-overlay p {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.transfers-indicator {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 0.8rem;
		max-width: 250px;
		backdrop-filter: blur(4px);
	}

	.transfers-indicator h4 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
	}

	.transfer-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.transfer-item:last-child {
		border-bottom: none;
	}

	.transfer-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-right: 0.5rem;
	}

	.transfer-status {
		font-size: 0.7rem;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-weight: 500;
	}

	.transfer-item.completed .transfer-status {
		background: #10b981;
		color: white;
	}

	.transfer-item.failed .transfer-status {
		background: #ef4444;
		color: white;
	}

	.transfer-item.pending .transfer-status {
		background: #f59e0b;
		color: white;
	}

	.no-session {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #64748b;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	.no-session svg {
		width: 64px;
		height: 64px;
		opacity: 0.5;
	}

	.no-session h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.no-session p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		max-width: 400px;
	}
</style> 