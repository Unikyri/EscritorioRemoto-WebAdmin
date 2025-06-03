# EscritorioRemoto-WebAdmin

Panel de administración web para el sistema de Escritorio Remoto - **FASE 8 - PASO 1 COMPLETADA** ✅

## 🎯 Estado del Proyecto

### FASE 8 - PASO 1: Transferencia de Archivos - ✅ COMPLETADA
- ✅ **FileTransferService**: Servicio para comunicación con API backend
- ✅ **FileTransferModal**: Modal intuitivo para subir archivos
- ✅ **RemoteControlViewer**: Integración del botón de transferencia
- ✅ **Drag & Drop**: Soporte para arrastrar archivos
- ✅ **Estados visuales**: Indicaciones de progreso y resultado
- ✅ **Transferencias recientes**: Overlay con últimas transferencias

### FASE 1: Autenticación del Administrador - ✅ COMPLETADA
- ✅ **Store de Autenticación**: Manejo global del estado con Svelte stores
- ✅ **Servicio de Autenticación**: Comunicación con API backend
- ✅ **Página de Login**: Interfaz elegante con validación
- ✅ **Dashboard Administrativo**: Panel de control básico
- ✅ **Protección de Rutas**: Redirección automática según autenticación
- ✅ **Persistencia de Sesión**: LocalStorage para mantener sesión
- ✅ **Manejo de Errores**: Feedback visual para errores de autenticación

## 🚀 Tecnologías

- **SvelteKit**: Framework principal
- **TypeScript**: Tipado estático
- **Vite**: Build tool y dev server
- **CSS3**: Estilos personalizados con gradientes y animaciones

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   ├── stores/
│   │   └── auth.ts              # Store global de autenticación
│   ├── services/
│   │   ├── authService.ts       # Servicio para comunicación con API
│   │   └── fileTransferService.ts # Servicio para transferencia de archivos
│   └── components/dashboard/
│       ├── FileTransferModal.svelte # Modal para transferir archivos
│       └── RemoteControlViewer.svelte # Visor de control remoto (actualizado)
├── routes/
│   ├── +layout.svelte          # Layout principal con protección de rutas
│   ├── +page.svelte            # Página principal (redirección)
│   ├── login/
│   │   └── +page.svelte        # Página de login
│   └── dashboard/
│       └── +page.svelte        # Dashboard administrativo
└── app.html                    # Template HTML base
```

## 🔧 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Backend ejecutándose en `http://localhost:8080`

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/Unikyri/EscritorioRemoto-WebAdmin.git
cd EscritorioRemoto-WebAdmin

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Scripts Disponibles
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Preview del build
npm run check        # Verificación de tipos TypeScript
npm run check:watch  # Verificación en modo watch
```

## 🌐 Uso

### 1. Acceso a la Aplicación
- Abrir navegador en `http://localhost:5173`
- Redirección automática a `/login` si no está autenticado

### 2. Credenciales de Prueba
```
Usuario: admin
Contraseña: password
```

### 3. Funcionalidades Disponibles

#### Transferencia de Archivos (NUEVO) 📁
- **Botón de transferencia**: Icono en la barra de controles durante sesión activa
- **Modal intuitivo**: Interfaz drag & drop para subir archivos
- **Nombre personalizable**: Especificar nombre del archivo en el cliente
- **Estados visuales**: 
  - 🔄 "Subiendo archivo al servidor..."
  - ✅ "Transferencia iniciada exitosamente"
  - ❌ "Error al transferir archivo"
- **Indicador de transferencias**: Overlay con últimas 5 transferencias
- **Estados de transferencia**: PENDING, IN_PROGRESS, COMPLETED, FAILED

#### Página de Login
- Formulario con validación en tiempo real
- Mostrar/ocultar contraseña
- Verificación de conexión con backend
- Manejo de errores con feedback visual
- Credenciales de prueba visibles

#### Dashboard
- Información del usuario autenticado
- Estado de conexión con backend
- Resumen del estado de FASE 1
- Vista previa de próximas fases
- Botón de verificación de backend

#### Protección de Rutas
- Redirección automática a `/login` si no autenticado
- Redirección a `/dashboard` si ya autenticado
- Persistencia de sesión en localStorage
- Logout automático en caso de token expirado

## 📁 Transferencia de Archivos

### FileTransferService
```typescript
interface FileTransferResponse {
  success: boolean;
  message: string;
  data?: {
    transfer_id: string;
    file_name: string;
    target_pc_id: string;
    session_id: string;
    status: string;
    file_size_mb: number;
    destination_path: string;
  };
  error?: string;
}
```

### Métodos Disponibles
- `sendFileToClient()`: Subir archivo desde PC admin
- `sendServerFileToClient()`: Enviar archivo existente en servidor
- `getSessionTransfers()`: Obtener transferencias de una sesión
- `getTransferStatus()`: Estado de transferencia específica
- `getPendingTransfers()`: Transferencias pendientes

### Estados de Transferencia
| Estado | Descripción | Color UI |
|--------|-------------|----------|
| `PENDING` | Transferencia creada, esperando procesamiento | 🟡 Amarillo |
| `IN_PROGRESS` | Enviando chunks al cliente | 🔵 Azul |
| `COMPLETED` | Transferencia exitosa | 🟢 Verde |
| `FAILED` | Error en transferencia | 🔴 Rojo |

## 🔐 Autenticación

### Store de Autenticación (`authStore`)
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
```

### Métodos Disponibles
- `init()`: Inicializar desde localStorage
- `login(token, user)`: Guardar sesión exitosa
- `logout()`: Limpiar sesión
- `setLoading(boolean)`: Estado de carga
- `setError(string)`: Manejo de errores
- `isTokenValid()`: Verificar expiración JWT

### Servicio de Autenticación (`authService`)
- `login(username, password)`: Autenticación con backend
- `logout()`: Cerrar sesión
- `getAuthHeader()`: Headers para peticiones autenticadas
- `authenticatedFetch()`: Peticiones con token automático
- `checkAuthStatus()`: Verificar estado con backend
- `checkBackendHealth()`: Verificar conexión backend

## 🎨 Diseño y UX

### Características de Diseño
- **Gradientes modernos**: Paleta azul/púrpura
- **Animaciones suaves**: Transiciones y hover effects
- **Responsive**: Adaptable a móviles y tablets
- **Iconos emoji**: Interfaz amigable y moderna
- **Loading states**: Feedback visual durante operaciones
- **Error handling**: Alertas claras y descriptivas
- **Drag & Drop**: Área de carga intuitiva para archivos

### Paleta de Colores
- Primario: `#667eea` → `#764ba2`
- Éxito: `#28a745`
- Error: `#dc3545`
- Advertencia: `#ffc107`
- Texto: `#333` / `#666`

## 🔗 Integración con Backend

### Endpoints Utilizados
- `GET /health`: Verificación de estado
- `POST /api/auth/login`: Autenticación
- `GET /api/auth/verify`: Verificación de token (futuro)
- **`POST /api/admin/sessions/{sessionID}/files/send`**: Transferir archivo a cliente
- **`GET /api/admin/sessions/{sessionID}/files`**: Obtener transferencias de sesión
- **`GET /api/admin/transfers/{transferID}/status`**: Estado de transferencia específica
- **`GET /api/admin/transfers/pending`**: Transferencias pendientes

### Configuración de API
```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

### CORS
El backend está configurado para permitir peticiones desde el frontend con headers apropiados.

## 🧪 Pruebas

### Pruebas de Transferencia de Archivos ✅
1. **Subir archivo mediante drag & drop**: Arrastra archivo al modal
2. **Subir archivo mediante click**: Selecciona archivo con explorador
3. **Especificar nombre personalizado**: Cambia nombre para el cliente
4. **Estados visuales**: Observa progreso de transferencia
5. **Transferencias recientes**: Ve historial en overlay
6. **Validaciones**: Archivo requerido, nombre requerido

### Pruebas Manuales Realizadas ✅
1. **Acceso sin autenticación**: Redirección a login
2. **Login con credenciales incorrectas**: Error mostrado
3. **Login con credenciales correctas**: Redirección a dashboard
4. **Persistencia de sesión**: Recarga mantiene sesión
5. **Logout**: Limpieza de sesión y redirección
6. **Verificación de backend**: Estado de conexión
7. **Responsive design**: Funciona en móviles

### Casos de Prueba
```bash
# 1. Backend desconectado
# 2. Credenciales incorrectas
# 3. Login exitoso
# 4. Navegación protegida
# 5. Logout manual
# 6. Token expirado
# 7. Recarga de página
# 8. Transferencia de archivos (NUEVO)
# 9. Estados de transferencia (NUEVO)
```

## 📋 Próximas Fases

### FASE 8 - PASO 2: Cliente Wails
- Recepción de chunks de archivos
- Procesamiento y guardado en cliente
- Notificaciones de progreso

### FASE 2: Cliente y Registro de PC
- Gestión de usuarios cliente
- Registro de equipos
- Estados de conexión

### FASE 3: Visualización de PCs
- Lista de PCs conectados
- Estados en tiempo real
- Filtros y búsqueda

### FASE 4+: Control Remoto

## 🐛 Problemas Conocidos

- Ninguno identificado en FASE 1

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto es parte del MVP de Escritorio Remoto para fines educativos.

## 📞 Soporte

Para soporte técnico o preguntas sobre la implementación, contactar al equipo de desarrollo.

---

**Estado**: ✅ FASE 1 COMPLETADA - Lista para FASE 2
**Versión**: v1.0.0-fase1
**Última actualización**: Junio 2025
