import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './middleware/config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import audioRoutes from './routes/audioRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Aplicación principal de Speech-to-Text API
 * @class App
 */
class App {
  /**
   * Constructor de la aplicación
   */
  constructor() {
    this.app = express();
    this.port = config.server.port;
  }

  /**
   * Configura los middlewares de la aplicación
   * @private
   */
  configureMiddlewares() {
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Parser JSON
    this.app.use(express.json({ limit: '1mb' }));
    
    // Parser URL encoded
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  /**
   * Configura las rutas de la aplicación
   * @private
   */
  configureRoutes() {
    // Ruta raíz
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        data: {
          name: 'Speech-to-Text API',
          description: 'Servicio de transcripción de audio usando Groq API',
          version: '1.0.0',
          status: 'activo',
          timestamp: new Date().toISOString(),
        },
        message: 'Bienvenido a la API de Speech-to-Text',
      });
    });

    // Rutas de audio
    this.app.use('/api/audio', audioRoutes);
    
    // Rutas del sistema
    this.app.use('/api/system', systemRoutes);

    // Middleware para rutas no encontradas
    this.app.use(notFoundHandler);

    // Middleware de manejo de errores
    this.app.use(errorHandler);
  }

  /**
   * Crea los directorios necesarios si no existen
   * @private
   */
  async createDirectories() {
    const directories = [
      config.audio.uploadsDir,
      config.audio.audioDir,
      config.audio.textsDir,
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✓ Directorio creado/verificado: ${dir}`);
      } catch (error) {
        console.error(`✗ Error al crear directorio ${dir}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Inicializa la aplicación
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('🚀 Inicializando Speech-to-Text API...');

      // Validar configuración
      const configValidation = validateConfig();
      if (!configValidation.valid) {
        console.error('❌ Error en la configuración:');
        configValidation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      console.log('✓ Configuración validada');

      // Crear directorios necesarios
      await this.createDirectories();

      // Configurar middlewares
      this.configureMiddlewares();
      console.log('✓ Middlewares configurados');

      // Configurar rutas
      this.configureRoutes();
      console.log('✓ Rutas configuradas');

      console.log('✅ Aplicación inicializada correctamente');

    } catch (error) {
      console.error('❌ Error al inicializar la aplicación:', error.message);
      process.exit(1);
    }
  }

  /**
   * Inicia el servidor
   * @returns {Promise<void>}
   */
  async start() {
    try {
      await this.initialize();

      const server = this.app.listen(this.port, () => {
        console.log('🎉 Servidor iniciado exitosamente');
        console.log(`📍 URL: http://localhost:${this.port}`);
        console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🤖 Modelo Groq: ${config.groq.model}`);
        console.log('📁 Directorios:');
        console.log(`  - Audios: ${config.audio.audioDir}`);
        console.log(`  - Textos: ${config.audio.textsDir}`);
        console.log(`  - Uploads: ${config.audio.uploadsDir}`);
        console.log('');
        console.log('📋 Endpoints disponibles:');
        console.log('  GET  /                              - Información general');
        console.log('  GET  /api/system/health             - Estado del sistema');
        console.log('  GET  /api/system/config             - Configuración');
        console.log('  GET  /api/system/info               - Información detallada');
        console.log('  POST /api/audio/transcribe          - Transcribir archivo');
        console.log('  POST /api/audio/translate           - Traducir archivo');
        console.log('  POST /api/audio/process-directory   - Procesar directorio');
        console.log('  GET  /api/audio/files               - Listar archivos');
        console.log('  GET  /api/audio/transcriptions      - Listar transcripciones');
        console.log('  GET  /api/audio/transcriptions/:id  - Obtener transcripción');
        console.log('');
        console.log('🔑 Asegúrate de configurar tu GROQ_TOKEN en el archivo .env');
      });

      // Manejo de señales de terminación
      process.on('SIGTERM', () => {
        console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
        server.close(() => {
          console.log('✅ Servidor cerrado correctamente');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
        server.close(() => {
          console.log('✅ Servidor cerrado correctamente');
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('❌ Error al iniciar el servidor:', error.message);
      process.exit(1);
    }
  }
}

// Crear y iniciar la aplicación
const app = new App();
app.start();
