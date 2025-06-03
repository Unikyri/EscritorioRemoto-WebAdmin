const WebSocket = require('ws');
const { createCanvas } = require('canvas');

console.log('🎬 Simulador de Cliente con Screen Frames');
console.log('=========================================');

const ws = new WebSocket('ws://localhost:8080/ws/client');
let sessionId = null;
let pcId = null;
let frameNum = 0;
let isStreaming = false;

ws.on('open', function open() {
    console.log('🔌 Cliente simulado conectado al servidor');
    
    // Autenticar
    console.log('🔐 Enviando autenticación...');
    ws.send(JSON.stringify({
        type: 'CLIENT_AUTH_REQUEST',
        data: {
            username: 'testuser',
            password: 'password123'
        }
    }));
});

ws.on('message', function message(data) {
    const msg = JSON.parse(data);
    console.log('📨 Recibido:', msg.type);
    
    if (msg.type === 'CLIENT_AUTH_RESPONSE') {
        if (msg.data.success) {
            console.log('✅ Autenticación exitosa');
            
            // Registrar PC
            console.log('🖥️ Registrando PC...');
            ws.send(JSON.stringify({
                type: 'PC_REGISTRATION_REQUEST',
                data: {
                    pcIdentifier: 'TEST-PC-FRAMES',
                    ip: '127.0.0.1'
                }
            }));
        } else {
            console.log('❌ Error de autenticación:', msg.data.error);
        }
    }
    
    if (msg.type === 'PC_REGISTRATION_RESPONSE') {
        if (msg.data.success) {
            pcId = msg.data.pcId;
            console.log('✅ PC registrado exitosamente:', pcId);
            console.log('⏳ Esperando solicitud de control remoto...');
        } else {
            console.log('❌ Error registrando PC:', msg.data.error);
        }
    }
    
    if (msg.type === 'remote_control_request') {
        sessionId = msg.data.session_id;
        console.log('🎮 Solicitud de control remoto recibida');
        console.log('   Sesión:', sessionId);
        console.log('   Admin:', msg.data.admin_username);
        
        // Aceptar automáticamente después de 2 segundos
        setTimeout(() => {
            console.log('✅ Aceptando solicitud de control...');
            ws.send(JSON.stringify({
                type: 'session_accepted',
                data: {
                    session_id: sessionId
                }
            }));
        }, 2000);
    }
    
    if (msg.type === 'session_started') {
        console.log('🚀 Sesión iniciada exitosamente');
        console.log('📹 Comenzando a enviar frames...');
        
        isStreaming = true;
        sendFramesPeriodically();
    }
    
    if (msg.type === 'input_command') {
        const cmd = msg.data;
        console.log(`🎮 Comando recibido: ${cmd.event_type}/${cmd.action}`, 
                   cmd.payload);
    }
});

ws.on('close', function close(code, reason) {
    console.log('🔌 Conexión cerrada:', code, reason.toString());
    isStreaming = false;
});

ws.on('error', function error(err) {
    console.error('❌ Error WebSocket:', err.message);
});

function sendFramesPeriodically() {
    if (!isStreaming || !sessionId) return;
    
    // Enviar frame cada 66ms (15 FPS)
    setInterval(() => {
        if (isStreaming && sessionId) {
            sendTestFrame();
        }
    }, 1000/15);
}

function sendTestFrame() {
    try {
        const frameData = generateTestFrameData(frameNum);
        
        const testFrame = {
            session_id: sessionId,
            timestamp: Date.now(),
            width: 800,
            height: 600,
            format: 'jpeg',
            quality: 75,
            frame_data: frameData,
            sequence_num: frameNum++
        };
        
        ws.send(JSON.stringify({
            type: 'screen_frame',
            data: testFrame
        }));
        
        // Log cada 30 frames (2 segundos)
        if (frameNum % 30 === 0) {
            console.log(`📹 Enviados ${frameNum} frames (${Math.round(frameNum/((Date.now() - startTime)/1000))} FPS)`);
        }
    } catch (error) {
        console.error('❌ Error enviando frame:', error.message);
    }
}

function generateTestFrameData(frameNum) {
    // Crear canvas
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Colores que rotan
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const bgColor = colors[Math.floor(frameNum / 15) % colors.length];
    
    // Fondo del color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 800, 600);
    
    // Círculo animado
    const circleX = 400 + Math.sin(frameNum * 0.1) * 200;
    const circleY = 300 + Math.cos(frameNum * 0.1) * 150;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(circleX, circleY, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    // Texto con información
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame ${frameNum}`, 400, 100);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Sesión: ${sessionId?.substring(0, 8)}...`, 400, 150);
    ctx.fillText(`PC: ${pcId?.substring(0, 8)}...`, 400, 180);
    
    // Timestamp
    ctx.font = '18px monospace';
    ctx.fillText(new Date().toLocaleTimeString(), 400, 520);
    
    // Barra de progreso animada
    const progressWidth = (frameNum % 100) * 6;
    ctx.fillStyle = '#333333';
    ctx.fillRect(100, 550, 600, 20);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(100, 550, progressWidth, 20);
    
    // Convertir a base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
}

// Variables globales
const startTime = Date.now();

console.log('\n💡 Instrucciones:');
console.log('1. Asegúrate de que el backend esté ejecutándose');
console.log('2. Inicia sesión como admin en el AdminWeb');
console.log('3. Inicia control remoto para el PC "TEST-PC-FRAMES"');
console.log('4. Deberías ver frames animados en el AdminWeb');
console.log('\n🔧 Para probar comandos de input:');
console.log('- Haz click en "Tomar Control" en el AdminWeb');
console.log('- Mueve el mouse y haz clicks sobre el canvas');
console.log('- Los comandos aparecerán en esta consola');
console.log('\n▶️ Iniciando simulación...\n'); 