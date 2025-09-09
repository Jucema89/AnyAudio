import Groq from 'groq-sdk';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { AudioConverter } from './audioConverter.js';

/**
 * Servicio para manejar la transcripción de archivos de audio usando la API de Groq
 * @class AudioService
 */
export class AudioService {
  /**
   * Constructor del servicio de audio
   * @param {string} groqToken - Token de autenticación para la API de Groq
   * @param {string} [model='whisper-large-v3-turbo'] - Modelo de Whisper a utilizar
   */
  constructor(groqToken, model = 'whisper-large-v3-turbo') {
    if (!groqToken) {
      throw new Error('El token de Groq es requerido');
    }
    
    this.client = new Groq({
      apiKey: groqToken,
    });
    
    this.model = model;
    this.audioConverter = new AudioConverter();
  }

  /**
   * Transcribe un archivo de audio a texto
   * @param {string} filePath - Ruta al archivo de audio
   * @param {Object} [options={}] - Opciones adicionales para la transcripción
   * @param {string} [options.language] - Código de idioma ISO-639-1 (ej: 'es', 'en')
   * @param {string} [options.prompt] - Prompt para guiar el estilo del modelo
   * @param {string} [options.responseFormat='verbose_json'] - Formato de respuesta
   * @param {Array<string>} [options.timestampGranularities=['segment']] - Granularidad de timestamps
   * @param {number} [options.temperature=0] - Temperatura para la generación
   * @returns {Promise<Object>} Resultado de la transcripción
   * @throws {Error} Si hay un error en la transcripción
   */
  async transcribeFile(filePath, options = {}) {
    let processedResult = null;
    
    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      // Procesar archivo (convertir .opus a .mp4 si es necesario)
      processedResult = await this.audioConverter.processAudioFile(filePath);
      
      if (!processedResult.success) {
        throw new Error(`Error procesando archivo: ${processedResult.error}`);
      }

      const actualFilePath = processedResult.processedPath;
      const fileName = path.basename(actualFilePath);
      
      const {
        language,
        prompt,
        responseFormat = 'verbose_json',
        timestampGranularities = ['segment'],
        temperature = 0
      } = options;

      console.log(`📝 Transcribiendo archivo: ${fileName}`);
      if (processedResult.wasConverted) {
        console.log(`🔄 Archivo convertido de ${processedResult.originalFormat} a ${processedResult.targetFormat}`);
      }

      // Configurar parámetros de transcripción
      const transcriptionParams = {
        file: fsSync.createReadStream(actualFilePath),
        model: this.model,
        response_format: responseFormat,
        temperature,
      };

      // Agregar parámetros opcionales si están presentes
      if (language) {
        transcriptionParams.language = language;
      }

      if (prompt) {
        transcriptionParams.prompt = prompt;
      }

      if (responseFormat === 'verbose_json' && timestampGranularities.length > 0) {
        transcriptionParams.timestamp_granularities = timestampGranularities;
      }

      // Realizar la transcripción
      const transcription = await this.client.audio.transcriptions.create(transcriptionParams);

      return {
        success: true,
        transcription,
        metadata: {
          fileName,
          originalFilePath: filePath,
          processedFilePath: actualFilePath,
          wasConverted: processedResult.wasConverted,
          conversionInfo: processedResult.wasConverted ? {
            originalFormat: processedResult.originalFormat,
            targetFormat: processedResult.targetFormat
          } : null,
          model: this.model,
          language: language || 'auto-detect',
          timestamp: new Date().toISOString(),
        }
      };

    } catch (error) {
      throw new Error(`Error al transcribir el archivo: ${error.message}`);
    }
  }

  /**
   * Traduce un archivo de audio a texto en inglés
   * @param {string} filePath - Ruta al archivo de audio
   * @param {Object} [options={}] - Opciones adicionales para la traducción
   * @param {string} [options.prompt] - Prompt para guiar el estilo del modelo
   * @param {string} [options.responseFormat='json'] - Formato de respuesta
   * @param {number} [options.temperature=0] - Temperatura para la generación
   * @returns {Promise<Object>} Resultado de la traducción
   * @throws {Error} Si hay un error en la traducción
   */
  async translateFile(filePath, options = {}) {
    let processedResult = null;
    
    try {
      // Verificar que el archivo existe
      await fs.access(filePath);
      
      // Procesar archivo (convertir .opus a .mp4 si es necesario)
      processedResult = await this.audioConverter.processAudioFile(filePath);
      
      if (!processedResult.success) {
        throw new Error(`Error procesando archivo: ${processedResult.error}`);
      }

      const actualFilePath = processedResult.processedPath;
      const fileName = path.basename(actualFilePath);
      
      const {
        prompt,
        responseFormat = 'json',
        temperature = 0
      } = options;

      console.log(`🌍 Traduciendo archivo: ${fileName}`);
      if (processedResult.wasConverted) {
        console.log(`🔄 Archivo convertido de ${processedResult.originalFormat} a ${processedResult.targetFormat}`);
      }

      // Configurar parámetros de traducción
      const translationParams = {
        file: fsSync.createReadStream(actualFilePath),
        model: this.model === 'whisper-large-v3-turbo' ? 'whisper-large-v3' : this.model, // turbo no soporta traducción
        response_format: responseFormat,
        temperature,
        language: 'en', // Solo inglés para traducciones
      };

      // Agregar prompt si está presente
      if (prompt) {
        translationParams.prompt = prompt;
      }

      // Realizar la traducción
      const translation = await this.client.audio.translations.create(translationParams);

      return {
        success: true,
        translation,
        metadata: {
          fileName,
          originalFilePath: filePath,
          processedFilePath: actualFilePath,
          wasConverted: processedResult.wasConverted,
          conversionInfo: processedResult.wasConverted ? {
            originalFormat: processedResult.originalFormat,
            targetFormat: processedResult.targetFormat
          } : null,
          model: translationParams.model,
          targetLanguage: 'en',
          timestamp: new Date().toISOString(),
        }
      };

    } catch (error) {
      throw new Error(`Error al traducir el archivo: ${error.message}`);
    }
  }

  /**
   * Procesa todos los archivos de audio en un directorio
   * @param {string} audioDirectory - Directorio que contiene los archivos de audio
   * @param {Object} [options={}] - Opciones para la transcripción
   * @param {string} [outputDirectory] - Directorio donde guardar las transcripciones
   * @returns {Promise<Array>} Array con los resultados de todas las transcripciones
   */
  async processAudioDirectory(audioDirectory, options = {}, outputDirectory = null) {
    try {
      // Leer archivos del directorio
      const files = await fs.readdir(audioDirectory);
      
      // Filtrar solo archivos de audio compatibles (incluyendo .opus que se convertirá automáticamente)
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.opus', '.webm', '.mp4', '.mpeg', '.mpga'];
      const audioFiles = files.filter(file => 
        audioExtensions.includes(path.extname(file).toLowerCase())
      );

      const results = [];

      for (const file of audioFiles) {
        const filePath = path.join(audioDirectory, file);
        
        try {
          const result = await this.transcribeFile(filePath, options);
          results.push(result);

          // Guardar transcripción si se especifica directorio de salida
          if (outputDirectory) {
            await this.saveTranscription(result, outputDirectory);
          }

        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            metadata: {
              fileName: file,
              filePath,
              timestamp: new Date().toISOString(),
            }
          });
        }
      }

      return results;

    } catch (error) {
      throw new Error(`Error al procesar directorio de audio: ${error.message}`);
    }
  }

  /**
   * Guarda una transcripción en un archivo de texto
   * @param {Object} transcriptionResult - Resultado de la transcripción
   * @param {string} outputDirectory - Directorio donde guardar el archivo
   * @returns {Promise<string>} Ruta del archivo guardado
   */
  async saveTranscription(transcriptionResult, outputDirectory) {
    try {
      // Crear directorio de salida si no existe
      await fs.mkdir(outputDirectory, { recursive: true });

      const { metadata, transcription } = transcriptionResult;
      const fileName = path.parse(metadata.fileName).name + '.txt';
      const outputPath = path.join(outputDirectory, fileName);

      let content;
      
      if (typeof transcription === 'string') {
        content = transcription;
      } else if (transcription.text) {
        content = transcription.text;
      } else {
        content = JSON.stringify(transcription, null, 2);
      }

      // Agregar metadatos al archivo
      const fileContent = `# Transcripción generada automáticamente
# Archivo: ${metadata.fileName}
# Modelo: ${metadata.model}
# Fecha: ${metadata.timestamp}
# Idioma: ${metadata.language || 'auto-detect'}

${content}
`;

      await fs.writeFile(outputPath, fileContent, 'utf8');
      return outputPath;

    } catch (error) {
      throw new Error(`Error al guardar transcripción: ${error.message}`);
    }
  }

  /**
   * Valida si un archivo es un formato de audio soportado
   * @param {string} filePath - Ruta al archivo
   * @returns {boolean} True si el archivo es soportado
   */
  static isValidAudioFile(filePath) {
    const supportedExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.opus', '.webm', '.mp4', '.mpeg', '.mpga'];
    const extension = path.extname(filePath).toLowerCase();
    return supportedExtensions.includes(extension);
  }

  /**
   * Obtiene información del archivo de audio
   * @param {string} filePath - Ruta al archivo
   * @returns {Promise<Object>} Información del archivo
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        name: path.basename(filePath),
        size: stats.size,
        extension: path.extname(filePath),
        lastModified: stats.mtime,
        isValidAudio: AudioService.isValidAudioFile(filePath)
      };
    } catch (error) {
      throw new Error(`Error al obtener información del archivo: ${error.message}`);
    }
  }
}
