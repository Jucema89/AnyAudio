import express from 'express';
import { config } from '../middleware/config.js';

const router = express.Router();

/**
 * GET /api/system/health
 * Endpoint de salud del sistema
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    },
    message: 'Sistema funcionando correctamente',
  });
});

/**
 * GET /api/system/config
 * Información de configuración del sistema (sin datos sensibles)
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      server: {
        port: config.server.port,
      },
      groq: {
        model: config.groq.model,
        hasToken: !!config.groq.token,
      },
      audio: {
        maxFileSize: config.audio.maxFileSize,
        allowedFormats: config.audio.allowedFormats,
        audioDir: config.audio.audioDir,
        textsDir: config.audio.textsDir,
      },
    },
    message: 'Configuración del sistema',
  });
});

/**
 * GET /api/system/info
 * Información general del sistema
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Speech-to-Text API',
      description: 'Servicio de transcripción de audio usando Groq API',
      version: '1.0.0',
      author: 'Tu Nombre',
      endpoints: {
        transcribe: 'POST /api/audio/transcribe',
        translate: 'POST /api/audio/translate',
        processDirectory: 'POST /api/audio/process-directory',
        listFiles: 'GET /api/audio/files',
        listTranscriptions: 'GET /api/audio/transcriptions',
        getTranscription: 'GET /api/audio/transcriptions/:filename',
        health: 'GET /api/system/health',
        config: 'GET /api/system/config',
      },
      groqModels: {
        'whisper-large-v3': {
          description: 'Modelo de alta precisión para transcripción y traducción multiidioma',
          supports: ['transcription', 'translation'],
          languages: 'multilingual',
        },
        'whisper-large-v3-turbo': {
          description: 'Modelo optimizado para velocidad en transcripción multiidioma',
          supports: ['transcription'],
          languages: 'multilingual',
          note: 'No soporta traducción',
        },
      },
    },
    message: 'Información del sistema Speech-to-Text',
  });
});

export default router;
