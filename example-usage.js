#!/usr/bin/env node

/**
 * Script de ejemplo para demostrar el uso de la API Speech-to-Text
 * 
 * Uso:
 * 1. Asegúrate de que el servidor esté corriendo: npm run dev
 * 2. Ejecuta este script: node example-usage.js
 */

// Usar fetch nativo de Node.js 18+
const fetch = globalThis.fetch;
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Función para hacer peticiones GET a la API
 * @param {string} endpoint - Endpoint de la API
 * @returns {Promise<Object>} Respuesta de la API
 */
async function getRequest(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error en GET ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * Función para hacer peticiones POST a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} data - Datos a enviar
 * @returns {Promise<Object>} Respuesta de la API
 */
async function postRequest(endpoint, data) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error en POST ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * Función para subir un archivo de audio (requiere FormData nativo)
 * @param {string} filePath - Ruta al archivo de audio
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Respuesta de la API
 */
async function transcribeFile(filePath, options = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return null;
    }

    // Leer archivo como buffer
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Crear FormData con File constructor nativo
    const form = new FormData();
    const file = new File([fileBuffer], fileName, {
      type: 'audio/mpeg' // Tipo genérico
    });
    form.append('audio', file);
    
    // Agregar opciones
    Object.keys(options).forEach(key => {
      form.append(key, options[key]);
    });

    const response = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      body: form,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error al transcribir archivo:', error.message);
    console.error('Nota: Esta función requiere Node.js 18+ con soporte para FormData y File');
    return null;
  }
}

/**
 * Función principal del ejemplo
 */
async function main() {
  console.log('🎙️ Demo de Speech-to-Text API\n');

  // 1. Verificar estado del sistema
  console.log('1. Verificando estado del sistema...');
  const health = await getRequest('/api/system/health');
  if (health?.success) {
    console.log('✅ Sistema funcionando correctamente');
    console.log(`   Uptime: ${Math.round(health.data.uptime)}s\n`);
  } else {
    console.log('❌ Sistema no disponible\n');
    return;
  }

  // 2. Obtener información del sistema
  console.log('2. Obteniendo configuración...');
  const config = await getRequest('/api/system/config');
  if (config?.success) {
    console.log('✅ Configuración obtenida:');
    console.log(`   Modelo: ${config.data.groq.model}`);
    console.log(`   Token configurado: ${config.data.groq.hasToken ? 'Sí' : 'No'}`);
    console.log(`   Tamaño máximo: ${Math.round(config.data.audio.maxFileSize / 1024 / 1024)}MB\n`);
  }

  // 3. Listar archivos de audio
  console.log('3. Listando archivos de audio...');
  const files = await getRequest('/api/audio/files');
  if (files?.success) {
    console.log(`✅ Encontrados ${files.data.count} archivos:`);
    files.data.files.forEach(file => {
      console.log(`   - ${file.name} (${Math.round(file.size / 1024)}KB)`);
    });
    console.log();
  }

  // 4. Procesar directorio (si hay archivos)
  if (files?.data?.count > 0) {
    console.log('4. Procesando directorio de audios...');
    const processResult = await postRequest('/api/audio/process-directory', {
      language: 'es',
      responseFormat: 'verbose_json',
      saveToFiles: true,
    });

    if (processResult?.success) {
      console.log('✅ Directorio procesado:');
      console.log(`   Total: ${processResult.data.summary.total}`);
      console.log(`   Exitosos: ${processResult.data.summary.successful}`);
      console.log(`   Fallidos: ${processResult.data.summary.failed}\n`);
    }
  } else {
    console.log('4. No hay archivos para procesar en el directorio audios/\n');
  }

  // 5. Listar transcripciones
  console.log('5. Listando transcripciones generadas...');
  const transcriptions = await getRequest('/api/audio/transcriptions');
  if (transcriptions?.success) {
    console.log(`✅ Encontradas ${transcriptions.data.count} transcripciones:`);
    transcriptions.data.transcriptions.forEach(file => {
      console.log(`   - ${file.name} (${Math.round(file.size / 1024)}KB)`);
    });
    console.log();

    // 6. Obtener una transcripción específica (si existe)
    if (transcriptions.data.count > 0) {
      const firstTranscription = transcriptions.data.transcriptions[0];
      console.log(`6. Obteniendo contenido de: ${firstTranscription.name}`);
      
      const content = await getRequest(`/api/audio/transcriptions/${firstTranscription.name}`);
      if (content?.success) {
        console.log('✅ Contenido obtenido:');
        const lines = content.data.content.split('\\n');
        const previewLines = lines.slice(0, 8); // Mostrar solo las primeras 8 líneas
        previewLines.forEach(line => console.log(`   ${line}`));
        if (lines.length > 8) {
          console.log(`   ... (${lines.length - 8} líneas más)`);
        }
      }
    }
  }

  console.log('\\n🎉 Demo completado!');
  console.log('\\n📚 Para más información, consulta el README.md');
  console.log('🔧 Endpoints disponibles en: http://localhost:3000/api/system/info');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { transcribeFile, getRequest, postRequest };
