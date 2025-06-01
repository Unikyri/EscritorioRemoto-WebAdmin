# Proyecto: Administración Remota de Equipos de Cómputo - AdminWeb

## 1. Descripción General

Este repositorio contiene el código fuente y la documentación del componente Frontend de Administración Web (AdminWeb). Esta es una Aplicación de Una Sola Página (SPA) que provee la interfaz gráfica para que los Administradores gestionen usuarios, visualicen y controlen PCs remotos, inicien transferencias de archivos y consulten informes.

## 2. Tecnologías Utilizadas

* **Svelte:** Framework JavaScript para construir la interfaz de usuario reactiva.
* **HTML5, CSS3, JavaScript/TypeScript:** Tecnologías web estándar para la estructura, estilo e interactividad.
* **WebSockets (WSS):** Para la comunicación en tiempo real con el Servidor Backend, especialmente para:
    * Recibir el stream del escritorio del PC Cliente durante el control remoto.
    * Enviar comandos de mouse/teclado al Servidor Backend.
    * Recibir logs o eventos en tiempo real en el dashboard.
* **HTTP/S (API REST):** Para la carga inicial de la aplicación, autenticación y operaciones CRUD con el Servidor Backend. 

## 3. Requerimientos Específicos del AdminWeb

* Permitir al Administrador iniciar sesión.
* Proveer interfaz para crear nuevos Usuarios Cliente.
* Mostrar una lista de PCs Cliente registrados y su estado de conexión. 
* Permitir iniciar y terminar sesiones de control remoto. 
    * Visualizar el escritorio del PC Cliente en tiempo real. 
    * Permitir el control del mouse y teclado del PC Cliente. 
* Permitir iniciar transferencias de archivos desde el servidor (o subidos por el admin) hacia un PC Cliente. 
* Mostrar informes básicos por usuario (sesiones de control, videos asociados, archivos transferidos).
* Permitir la descarga de videos de sesiones grabadas. 

## 4. Casos de Uso (Perspectiva del Administrador en la Web)

Estos casos de uso se centran en la interacción del Administrador con la interfaz web. El AdminWeb actúa como el cliente para el Servidor Backend.

* Autenticación del Administrador (interfaz para CU-A1). 
* Gestión de Cuentas de Usuario Cliente (interfaz para CU-A2). 
* Visualización de Lista de PCs Cliente (interfaz para CU-A3). 
* Administración de Sesión de Control Remoto (interfaz para CU-A4).
* Transferencia de Archivos a PC Cliente (interfaz para CU-A5).
* Consulta de Logs de Auditoría (interfaz para CU-A6). 
* Generación y Visualización de Informes (interfaz para CU-A7).



## 5. Modelo de Componentes y Flujo de Datos

* **Arquitectura General:** El AdminWeb (Svelte) se ejecuta en el navegador del Administrador y se comunica con el Servidor Backend (Go) vía HTTP/S y WebSockets.
* **DTOs (Data Transfer Objects):** La comunicación con el backend se realiza mediante DTOs definidos en la capa de presentación del servidor. Ejemplos: `AuthRequestDTO`, `UserDTO`, `ClientPCDTO`, `RemoteSessionDTO`, `FileTransferRequestDTO`, `InputCommandDTO`, `ClientActivityReportDTO`.
    * Ver Diagrama de Clases - Capa de Presentación del Servidor para la estructura de estos DTOs.
* **Gestión de Estado (Svelte):** Se utilizarán stores de Svelte para manejar el estado global de la aplicación (ej. estado de autenticación, lista de PCs, sesión de control activa).
* **Componentes Svelte (Ejemplos):**
    * `LoginPage.svelte`
    * `DashboardPage.svelte`
    * `UserManagementTable.svelte`
    * `PCList.svelte`
    * `RemoteControlView.svelte` (incluyendo visualizador de pantalla y manejadores de input)
    * `FileTransferModal.svelte`
    * `ReportsView.svelte`

## 6. Estructura de Carpetas (Proyecto Svelte)
```
/ (raíz del proyecto AdminWeb)
|-- src/
|   |-- components/             # Componentes Svelte reutilizables (botones, modales, tablas)
|   |-- routes/                 # O pages/ o views/ para las diferentes vistas/páginas de la SPA
|   |   |-- +layout.svelte
|   |   |-- +page.svelte          (para la ruta raíz, ej. login o dashboard)
|   |   |-- login/
|   |   |   |-- +page.svelte
|   |   |-- dashboard/
|   |   |   |-- +page.svelte
|   |   |-- users/
|   |   |   |-- +page.svelte
|   |   |-- pcs/
|   |   |   |-- +page.svelte
|   |   |   |-- [id]/control/
|   |   |       |-- +page.svelte  (para la vista de control remoto)
|   |   |-- reports/
|   |       |-- +page.svelte
|   |-- stores/                 # Stores de Svelte para la gestión del estado global
|   |   |-- auth.js
|   |   |-- pcs.js
|   |-- services/               # Módulos para interactuar con la API del Backend
|   |   |-- authService.js
|   |   |-- pcService.js
|   |   |-- remoteControlService.js (manejo de WebSocket para control)
|   |-- utils/                  # Funciones de utilidad
|   |-- assets/                 # Imágenes, fuentes, etc.
|   |-- App.svelte              # (Si no se usa SvelteKit, podría ser el componente raíz)
|   |-- main.js                 # Punto de entrada de la aplicación Svelte
|-- public/                     # Archivos estáticos (index.html, favicon, etc.)
|-- package.json
|-- svelte.config.js
|-- vite.config.js (o rollup.config.js)
|-- README.md
```
