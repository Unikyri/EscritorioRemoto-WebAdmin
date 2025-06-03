<script lang="ts">
	import { onMount } from 'svelte';
	import { authService } from '$lib/services/authService';
	import { fileTransferService, type FileTransferStatus } from '$lib/services/fileTransferService';

	interface Client {
		pcId: string;
		identifier: string;
		ip: string;
		connectionStatus: string;
		ownerUserId: string;
		registeredAt: string;
		lastSeenAt?: string;
	}

	interface ClientTransfers {
		client: Client;
		transfers: FileTransferStatus[];
	}

	let clientTransfers: ClientTransfers[] = [];
	let allClients: Client[] = [];
	let selectedClient: string | null = null;
	let selectedTransfer: FileTransferStatus | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadClientsAndTransfers();
	});

	async function loadClientsAndTransfers() {
		try {
			loading = true;
			error = '';

			console.log('🔄 Cargando clientes...');
			
			// Primero obtener todos los clientes
			const clientsResponse = await authService.authenticatedFetch('/admin/pcs');
			
			if (!clientsResponse.ok) {
				throw new Error('Error cargando clientes');
			}

			const clientsData = await clientsResponse.json();
			
			if (!clientsData.success) {
				throw new Error(clientsData.error || 'Error desconocido al cargar clientes');
			}

			allClients = clientsData.data || [];
			console.log(`✅ Clientes cargados: ${allClients.length}`, allClients);

			// Luego obtener transferencias para cada cliente
			const transfers: ClientTransfers[] = [];

			for (const client of allClients) {
				console.log(`🔍 Buscando transferencias para cliente: ${client.identifier} (${client.pcId})`);
				
				try {
					const transfersResponse = await fileTransferService.getClientTransfers(client.pcId);
					console.log(`📊 Respuesta transferencias para ${client.identifier}:`, transfersResponse);
					
					// Validar respuesta y manejar casos null/undefined
					let clientTransfersList: FileTransferStatus[] = [];
					if (transfersResponse && transfersResponse.success && Array.isArray(transfersResponse.data)) {
						clientTransfersList = transfersResponse.data;
					} else if (transfersResponse && !transfersResponse.success && transfersResponse.error) {
						console.warn(`⚠️ API error para ${client.identifier}:`, transfersResponse.error);
					}
					
					// Siempre agregar el cliente, incluso si no tiene transferencias
					transfers.push({
						client: client,
						transfers: clientTransfersList
					});
					
					console.log(`✅ Cliente ${client.identifier}: ${clientTransfersList.length} transferencias`);
					
				} catch (err) {
					console.warn(`⚠️ Error obteniendo transferencias para ${client.identifier}:`, err);
					// Agregar cliente sin transferencias en caso de error
					transfers.push({
						client: client,
						transfers: []
					});
				}
			}

			clientTransfers = transfers;
			console.log('🎯 Resultado final:', clientTransfers);

		} catch (err: any) {
			console.error('❌ Error loading clients and transfers:', err);
			error = err.message || 'Error cargando datos';
		} finally {
			loading = false;
		}
	}

	function selectClient(clientId: string) {
		selectedClient = selectedClient === clientId ? null : clientId;
		selectedTransfer = null; // Reset selected transfer when changing client
	}

	function selectTransfer(transfer: FileTransferStatus) {
		selectedTransfer = selectedTransfer?.transfer_id === transfer.transfer_id ? null : transfer;
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

	function formatFileSize(sizeMB: number): string {
		if (sizeMB < 1) {
			return `${(sizeMB * 1024).toFixed(0)} KB`;
		}
		return `${sizeMB.toFixed(2)} MB`;
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'COMPLETED': return '✅';
			case 'FAILED': return '❌';
			case 'IN_PROGRESS': return '🔄';
			case 'PENDING': return '⏳';
			default: return '❓';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'COMPLETED': return 'Completado';
			case 'FAILED': return 'Fallido';
			case 'IN_PROGRESS': return 'En Progreso';
			case 'PENDING': return 'Pendiente';
			default: return status;
		}
	}
</script>

<svelte:head>
	<title>Transferencias - RemoteDesk Pro</title>
</svelte:head>

<div class="transfers-page">
	<div class="page-header">
		<div class="header-content">
			<h1>📁 Transferencias de Archivos</h1>
			<p class="page-subtitle">
				Visualiza el historial de archivos transferidos a los clientes durante sesiones de control remoto
			</p>
		</div>
		<button class="refresh-btn" on:click={loadClientsAndTransfers} disabled={loading}>
			<svg viewBox="0 0 24 24" fill="currentColor" class:spinning={loading}>
				<path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
			</svg>
			Actualizar
		</button>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Cargando transferencias...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<h3>❌ Error</h3>
			<p>{error}</p>
			<button on:click={loadClientsAndTransfers} class="retry-btn">Reintentar</button>
		</div>
	{:else if clientTransfers.length === 0}
		<div class="empty-state">
			<h3>📁 No hay clientes registrados</h3>
			<p>No se encontraron clientes en el sistema. Los clientes aparecerán aquí después de registrarse con el servidor.</p>
		</div>
	{:else}
		<div class="transfers-layout">
			<!-- Lista de clientes -->
			<div class="clients-sidebar">
				<h3>👥 Clientes Registrados ({clientTransfers.length})</h3>
				<div class="clients-list">
					{#each clientTransfers as clientData}
						<button
							class="client-item"
							class:active={selectedClient === clientData.client.pcId}
							class:has-transfers={clientData.transfers.length > 0}
							on:click={() => selectClient(clientData.client.pcId)}
						>
							<div class="client-icon">💻</div>
							<div class="client-info">
								<div class="client-name">{clientData.client.identifier}</div>
								<div class="client-stats">
									{#if clientData.transfers.length > 0}
										{clientData.transfers.length} transferencia{clientData.transfers.length !== 1 ? 's' : ''}
									{:else}
										Sin transferencias
									{/if}
								</div>
								<div class="client-status status-{clientData.client.connectionStatus.toLowerCase()}">
									{clientData.client.connectionStatus}
								</div>
							</div>
							{#if clientData.transfers.length > 0}
								<div class="transfer-badge">📁</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Panel principal -->
			<div class="main-panel">
				{#if selectedClient}
					{@const clientData = clientTransfers.find(c => c.client.pcId === selectedClient)}
					
					<div class="transfers-header">
						<h2>📊 Cliente: {clientData?.client.identifier || selectedClient}</h2>
						<div class="transfers-stats">
							<div class="stat">
								<span class="stat-label">Transferencias:</span>
								<span class="stat-value">{clientData?.transfers.length || 0}</span>
							</div>
							<div class="stat">
								<span class="stat-label">IP:</span>
								<span class="stat-value">{clientData?.client.ip}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Estado:</span>
								<span class="stat-value status-{clientData?.client.connectionStatus.toLowerCase()}">
									{clientData?.client.connectionStatus}
								</span>
							</div>
						</div>
					</div>

					{#if clientData?.transfers && clientData.transfers.length > 0}
						<div class="transfers-grid">
							{#each clientData.transfers as transfer}
								<div 
									class="transfer-card"
									class:selected={selectedTransfer?.transfer_id === transfer.transfer_id}
									on:click={() => selectTransfer(transfer)}
									role="button"
									tabindex="0"
								>
									<div class="transfer-header">
										<div class="transfer-icon">📄</div>
										<div class="transfer-status-badge status-{transfer.status.toLowerCase()}">
											{getStatusIcon(transfer.status)} {getStatusText(transfer.status)}
										</div>
									</div>
									<div class="transfer-info">
										<div class="transfer-title">{transfer.file_name}</div>
										<div class="transfer-details">
											<div class="detail">
												<span class="detail-label">📅 Transferido:</span>
												<span class="detail-value">{formatDate(transfer.transfer_time)}</span>
											</div>
											<div class="detail">
												<span class="detail-label">📏 Tamaño:</span>
												<span class="detail-value">{formatFileSize(transfer.file_size_mb)}</span>
											</div>
											<div class="detail">
												<span class="detail-label">🔗 Sesión:</span>
												<span class="detail-value">{transfer.session_id.slice(0, 8)}...</span>
											</div>
											<div class="detail">
												<span class="detail-label">📁 Destino:</span>
												<span class="detail-value">{transfer.destination_path}</span>
											</div>
										</div>
										{#if transfer.error_message}
											<div class="transfer-error">
												❌ {transfer.error_message}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="no-transfers-for-client">
							<h3>📁 Sin transferencias</h3>
							<p>Este cliente no tiene transferencias de archivos aún.</p>
							{#if clientData?.client.connectionStatus === 'OFFLINE'}
								<p class="client-offline-warning">
									⚠️ <strong>Cliente desconectado:</strong> Para transferir archivos, el cliente debe estar online y conectado durante una sesión de control remoto.
								</p>
							{/if}
						</div>
					{/if}

					<!-- Detalle de transferencia seleccionada -->
					{#if selectedTransfer}
						<div class="transfer-detail-section">
							<h3>📋 Detalles de Transferencia</h3>
							<div class="transfer-detail-card">
								<div class="detail-grid">
									<div class="detail-item">
										<label>ID de Transferencia:</label>
										<span class="monospace">{selectedTransfer.transfer_id}</span>
									</div>
									<div class="detail-item">
										<label>Nombre del Archivo:</label>
										<span>{selectedTransfer.file_name}</span>
									</div>
									<div class="detail-item">
										<label>Estado:</label>
										<span class="status-badge status-{selectedTransfer.status.toLowerCase()}">
											{getStatusIcon(selectedTransfer.status)} {getStatusText(selectedTransfer.status)}
										</span>
									</div>
									<div class="detail-item">
										<label>Tamaño:</label>
										<span>{formatFileSize(selectedTransfer.file_size_mb)}</span>
									</div>
									<div class="detail-item">
										<label>Ruta de Destino:</label>
										<span class="monospace">{selectedTransfer.destination_path}</span>
									</div>
									<div class="detail-item">
										<label>ID de Sesión:</label>
										<span class="monospace">{selectedTransfer.session_id}</span>
									</div>
									<div class="detail-item">
										<label>Tiempo de Transferencia:</label>
										<span>{formatDate(selectedTransfer.transfer_time)}</span>
									</div>
									<div class="detail-item">
										<label>Creado:</label>
										<span>{formatDate(selectedTransfer.created_at)}</span>
									</div>
									{#if selectedTransfer.updated_at !== selectedTransfer.created_at}
										<div class="detail-item">
											<label>Actualizado:</label>
											<span>{formatDate(selectedTransfer.updated_at)}</span>
										</div>
									{/if}
									{#if selectedTransfer.error_message}
										<div class="detail-item full-width">
											<label>Mensaje de Error:</label>
											<span class="error-message">{selectedTransfer.error_message}</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}
				{:else}
					<div class="no-client-selected">
						<h3>👈 Selecciona un cliente</h3>
						<p>Elige un cliente de la lista para ver sus transferencias de archivos.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.transfers-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 2rem;
	}

	.header-content h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		font-weight: 700;
		color: #1a365d;
	}

	.page-subtitle {
		margin: 0;
		color: #64748b;
		font-size: 1.1rem;
		line-height: 1.5;
	}

	.refresh-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.refresh-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(49, 130, 206, 0.3);
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
		to { transform: rotate(360deg); }
	}

	.loading-state, .error-state, .empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e2e8f0;
		border-top: 3px solid #3182ce;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.error-state h3, .empty-state h3 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		color: #1a365d;
	}

	.retry-btn {
		padding: 0.75rem 1.5rem;
		background: #3182ce;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		margin-top: 1rem;
	}

	.transfers-layout {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 2rem;
		min-height: 600px;
	}

	.clients-sidebar {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		padding: 1.5rem;
		height: fit-content;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.clients-sidebar h3 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a365d;
	}

	.clients-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.client-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
	}

	.client-item:hover {
		background: #f1f5f9;
		border-color: #3182ce;
	}

	.client-item.active {
		background: linear-gradient(135deg, #3182ce 0%, #10b981 100%);
		color: white;
		border-color: transparent;
	}

	.client-item.active .client-status {
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	.client-item.active .client-status {
		background: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	.client-item.has-transfers {
		border-left: 4px solid #10b981;
	}

	.transfer-badge {
		font-size: 1.2rem;
		margin-left: auto;
		opacity: 0.7;
	}

	.client-item.active .transfer-badge {
		opacity: 1;
	}

	.client-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.client-info {
		flex: 1;
		min-width: 0;
	}

	.client-name {
		font-weight: 600;
		margin-bottom: 0.25rem;
		word-break: break-all;
	}

	.client-stats {
		font-size: 0.85rem;
		opacity: 0.8;
		margin-bottom: 0.25rem;
	}

	.client-status {
		font-size: 0.7rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-weight: 500;
		text-transform: uppercase;
	}

	.client-status.status-online {
		background: rgba(16, 185, 129, 0.2);
		color: #065f46;
	}

	.client-status.status-offline {
		background: rgba(239, 68, 68, 0.2);
		color: #991b1b;
	}

	.main-panel {
		background: white;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.transfers-header {
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		padding-bottom: 1rem;
	}

	.transfers-header h2 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a365d;
	}

	.transfers-stats {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		color: #64748b;
		font-weight: 500;
	}

	.stat-value {
		font-weight: 600;
		color: #1a365d;
	}

	.transfers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.transfer-card {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		background: white;
	}

	.transfer-card:hover {
		border-color: #3182ce;
		box-shadow: 0 4px 12px rgba(49, 130, 206, 0.1);
	}

	.transfer-card.selected {
		border-color: #3182ce;
		background: #f0f9ff;
		box-shadow: 0 4px 12px rgba(49, 130, 206, 0.2);
	}

	.transfer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.transfer-icon {
		font-size: 1.5rem;
	}

	.transfer-status-badge {
		font-size: 0.7rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.transfer-status-badge.status-completed {
		background: #d1fae5;
		color: #065f46;
	}

	.transfer-status-badge.status-failed {
		background: #fee2e2;
		color: #991b1b;
	}

	.transfer-status-badge.status-in_progress {
		background: #dbeafe;
		color: #1e40af;
	}

	.transfer-status-badge.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.transfer-title {
		font-weight: 600;
		font-size: 1.1rem;
		color: #1a365d;
		margin-bottom: 0.75rem;
		word-break: break-all;
	}

	.transfer-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.detail {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.detail-label {
		font-size: 0.85rem;
		color: #64748b;
		min-width: fit-content;
	}

	.detail-value {
		font-size: 0.85rem;
		font-weight: 500;
		color: #1a365d;
		text-align: right;
		word-break: break-all;
	}

	.transfer-error {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: #fee2e2;
		color: #991b1b;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.no-client-selected {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 400px;
		text-align: center;
		color: #64748b;
	}

	.no-client-selected h3 {
		margin: 0 0 1rem;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.transfer-detail-section {
		border-top: 1px solid #e2e8f0;
		padding-top: 1.5rem;
		margin-top: 1.5rem;
	}

	.transfer-detail-section h3 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1a365d;
	}

	.transfer-detail-card {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-item.full-width {
		grid-column: 1 / -1;
	}

	.detail-item label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.detail-item span {
		font-weight: 500;
		color: #1a365d;
	}

	.monospace {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.85rem;
		background: rgba(0, 0, 0, 0.05);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.status-badge.status-completed {
		background: #d1fae5;
		color: #065f46;
	}

	.status-badge.status-failed {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-badge.status-in_progress {
		background: #dbeafe;
		color: #1e40af;
	}

	.status-badge.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.error-message {
		color: #dc2626;
		font-weight: 500;
	}

	.no-transfers-for-client {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 300px;
		text-align: center;
		color: #64748b;
		background: #f8fafc;
		border-radius: 8px;
		padding: 2rem;
		margin: 1rem 0;
	}

	.no-transfers-for-client h3 {
		margin: 0 0 1rem;
		font-size: 1.3rem;
		font-weight: 600;
		color: #1a365d;
	}

	.client-offline-warning {
		margin-top: 1rem;
		padding: 1rem;
		background: #fef3c7;
		color: #92400e;
		border-radius: 6px;
		border-left: 4px solid #f59e0b;
		font-size: 0.9rem;
	}

	@media (max-width: 1024px) {
		.transfers-layout {
			grid-template-columns: 1fr;
		}

		.transfers-grid {
			grid-template-columns: 1fr;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style> 