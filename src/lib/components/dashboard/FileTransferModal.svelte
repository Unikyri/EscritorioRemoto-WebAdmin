<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fileTransferService, type FileTransferResponse } from '$lib/services/fileTransferService';

	export let isOpen = false;
	export let sessionId: string;
	export let clientPcId: string;

	const dispatch = createEventDispatcher();

	let selectedFile: File | null = null;
	let clientFileName = '';
	let isTransferring = false;
	let transferStatus: 'idle' | 'uploading' | 'completed' | 'failed' = 'idle';
	let transferMessage = '';
	let fileInput: HTMLInputElement;

	// Resetear estado cuando se abre el modal
	$: if (isOpen) {
		resetForm();
	}

	function resetForm() {
		selectedFile = null;
		clientFileName = '';
		isTransferring = false;
		transferStatus = 'idle';
		transferMessage = '';
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (file) {
			selectedFile = file;
			// Auto-completar el nombre del archivo si está vacío
			if (!clientFileName) {
				clientFileName = file.name;
			}
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'copy';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		const files = event.dataTransfer?.files;
		
		if (files && files.length > 0) {
			const file = files[0];
			selectedFile = file;
			if (!clientFileName) {
				clientFileName = file.name;
			}
			
			// Actualizar el input file
			if (fileInput) {
				const dt = new DataTransfer();
				dt.items.add(file);
				fileInput.files = dt.files;
			}
		}
	}

	async function handleTransfer() {
		if (!selectedFile || !clientFileName.trim()) {
			transferMessage = 'Por favor selecciona un archivo y especifica el nombre para el cliente';
			transferStatus = 'failed';
			return;
		}

		isTransferring = true;
		transferStatus = 'uploading';
		transferMessage = 'Subiendo archivo al servidor...';

		try {
			const response: FileTransferResponse = await fileTransferService.sendFileToClient(
				sessionId,
				selectedFile,
				clientPcId,
				clientFileName.trim()
			);

			if (response.success) {
				transferStatus = 'completed';
				transferMessage = `Transferencia iniciada exitosamente. ID: ${response.data?.transfer_id.substring(0, 8)}...`;
				
				// Emitir evento para que el componente padre pueda actualizar
				dispatch('transfer-completed', {
					transferId: response.data?.transfer_id,
					fileName: response.data?.file_name,
					status: response.data?.status
				});

				// Cerrar modal después de un breve delay
				setTimeout(() => {
					closeModal();
				}, 2000);
			} else {
				throw new Error(response.error || 'Error desconocido en la transferencia');
			}
		} catch (error) {
			console.error('Transfer error:', error);
			transferStatus = 'failed';
			transferMessage = error instanceof Error ? error.message : 'Error al transferir archivo';
		} finally {
			isTransferring = false;
		}
	}

	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal-overlay" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()}>
		<div class="modal" on:click|stopPropagation>
			<div class="modal-header">
				<h2>Transferir Archivo</h2>
				<button class="close-btn" on:click={closeModal} aria-label="Cerrar">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
					</svg>
				</button>
			</div>

			<div class="modal-content">
				<div class="session-info">
					<p><strong>Sesión:</strong> {sessionId.substring(0, 8)}...</p>
					<p><strong>PC Cliente:</strong> {clientPcId.substring(0, 8)}...</p>
				</div>

				<div class="file-upload-section">
					<label for="file-input" class="file-upload-area" 
						   class:has-file={selectedFile}
						   on:dragover={handleDragOver}
						   on:drop={handleDrop}>
						{#if selectedFile}
							<div class="file-selected">
								<svg viewBox="0 0 24 24" fill="currentColor" class="file-icon">
									<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
								</svg>
								<div class="file-info">
									<p class="file-name">{selectedFile.name}</p>
									<p class="file-size">{formatFileSize(selectedFile.size)}</p>
								</div>
							</div>
						{:else}
							<div class="file-upload-prompt">
								<svg viewBox="0 0 24 24" fill="currentColor" class="upload-icon">
									<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
								</svg>
								<p><strong>Haz clic para seleccionar</strong> o arrastra un archivo aquí</p>
								<p class="upload-hint">Máximo 100MB por archivo</p>
							</div>
						{/if}
					</label>
					<input 
						type="file" 
						id="file-input" 
						bind:this={fileInput}
						on:change={handleFileSelect}
						accept="*"
						style="display: none;"
					>
				</div>

				<div class="form-field">
					<label for="client-filename">Nombre del archivo en el cliente:</label>
					<input 
						type="text" 
						id="client-filename"
						bind:value={clientFileName}
						placeholder="Ej: documento.pdf"
						disabled={isTransferring}
					>
					<p class="field-hint">El archivo se guardará con este nombre en el cliente</p>
				</div>

				{#if transferMessage}
					<div class="transfer-status" class:success={transferStatus === 'completed'} 
						 class:error={transferStatus === 'failed'} class:loading={transferStatus === 'uploading'}>
						{#if transferStatus === 'uploading'}
							<div class="loading-spinner"></div>
						{:else if transferStatus === 'completed'}
							<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
								<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
							</svg>
						{:else if transferStatus === 'failed'}
							<svg viewBox="0 0 24 24" fill="currentColor" class="status-icon">
								<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A2,2 0 0,1 14,8A2,2 0 0,1 12,10A2,2 0 0,1 10,8A2,2 0 0,1 12,6M12,12A2,2 0 0,1 14,14A2,2 0 0,1 12,16A2,2 0 0,1 10,14A2,2 0 0,1 12,12Z"/>
							</svg>
						{/if}
						<p>{transferMessage}</p>
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn-secondary" on:click={closeModal} disabled={isTransferring}>
					Cancelar
				</button>
				<button 
					class="btn-primary" 
					on:click={handleTransfer} 
					disabled={!selectedFile || !clientFileName.trim() || isTransferring}
				>
					{#if isTransferring}
						<div class="btn-spinner"></div>
						Transfiriendo...
					{:else}
						Transferir Archivo
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1a365d;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #64748b;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: #f1f5f9;
		color: #475569;
	}

	.close-btn svg {
		width: 18px;
		height: 18px;
	}

	.modal-content {
		padding: 1.5rem;
	}

	.session-info {
		background: #f8fafc;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.session-info p {
		margin: 0;
		font-size: 0.9rem;
		color: #475569;
	}

	.session-info p:not(:last-child) {
		margin-bottom: 0.5rem;
	}

	.file-upload-section {
		margin-bottom: 1.5rem;
	}

	.file-upload-area {
		display: block;
		width: 100%;
		min-height: 120px;
		border: 2px dashed #cbd5e1;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		background: #fafafa;
	}

	.file-upload-area:hover {
		border-color: #3b82f6;
		background: #f0f9ff;
	}

	.file-upload-area.has-file {
		border-color: #10b981;
		background: #f0fdf4;
		border-style: solid;
	}

	.file-upload-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.upload-icon {
		width: 48px;
		height: 48px;
		color: #94a3b8;
		margin-bottom: 0.5rem;
	}

	.file-upload-prompt p {
		margin: 0;
		color: #475569;
	}

	.upload-hint {
		font-size: 0.85rem !important;
		color: #94a3b8 !important;
	}

	.file-selected {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.file-icon {
		width: 40px;
		height: 40px;
		color: #10b981;
		flex-shrink: 0;
	}

	.file-info {
		text-align: left;
		flex: 1;
	}

	.file-name {
		margin: 0;
		font-weight: 500;
		color: #1f2937;
		word-break: break-all;
	}

	.file-size {
		margin: 0.25rem 0 0;
		font-size: 0.85rem;
		color: #6b7280;
	}

	.form-field {
		margin-bottom: 1.5rem;
	}

	.form-field label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
	}

	.form-field input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.9rem;
		transition: border-color 0.2s ease;
	}

	.form-field input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-field input:disabled {
		background: #f9fafb;
		color: #9ca3af;
	}

	.field-hint {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: #6b7280;
	}

	.transfer-status {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.transfer-status.loading {
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		color: #1e40af;
	}

	.transfer-status.success {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}

	.transfer-status.error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
	}

	.loading-spinner, .btn-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(59, 130, 246, 0.3);
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		flex-shrink: 0;
	}

	.btn-spinner {
		width: 16px;
		height: 16px;
		border-width: 1.5px;
		border-color: rgba(255, 255, 255, 0.3);
		border-top-color: white;
	}

	.status-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.transfer-status p {
		margin: 0;
		font-size: 0.9rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.btn-secondary, .btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.btn-secondary {
		background: #f8fafc;
		color: #475569;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f5f9;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary:disabled, .btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style> 