import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración de la aplicación
 * @namespace Config
 */
export const config = {
  /**
   * Configuración del servidor
   */
  server: {
    port: process.env.PORT || 3000,
  },

  /**
   * Configuración de Groq API
   */
  groq: {
    token: process.env.GROQ_TOKEN,
    model: process.env.WHISPER_MODEL || 'whisper-large-v3-turbo',
  },

  /**
   * Configuración de archivos de audio
   */
  audio: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 26214400, // 25MB por defecto
    allowedFormats: process.env.ALLOWED_AUDIO_FORMATS?.split(',') || [
      'mp3', 'wav', 'm4a', 'flac', 'ogg', 'opus', 'webm', 'mp4', 'mpeg', 'mpga'
    ],
    uploadsDir: 'uploads',
    audioDir: 'audios',
    textsDir: 'texts',
  },
};

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 * @returns {Object} Resultado de la validación
 */
export function validateConfig() {
  const errors = [];

  if (!config.groq.token) {
    errors.push('GROQ_TOKEN es requerido en las variables de entorno');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    config,
  };
}
