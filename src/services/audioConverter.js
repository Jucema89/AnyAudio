import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

/**
 * Servicio para convertir archivos de audio a formatos compatibles con Groq
 * @class AudioConverter
 */
export class AudioConverter {
  /**
   * Constructor del convertidor de audio
   */
  constructor() {
    this.sampleRate = 16000; // Recomendado por Groq para speech-to-text
    this.channels = 1; // Mono recomendado por Groq
  }

  /**
   * Determina si un archivo necesita conversión
   * @param {string} filePath - Ruta al archivo
   * @returns {boolean} True si necesita conversión
   */
  needsConversion(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return extension === '.opus';
  }

  /**
   * Convierte un archivo .opus a .mp4 manteniendo el mismo nombre base
   * @param {string} inputPath - Ruta del archivo .opus
   * @returns {Promise<string>} Ruta del archivo .mp4 convertido
   */
  async convertOpusToMp4(inputPath) {
    try {
      // Verificar que el archivo existe
      await fs.access(inputPath);

      // Generar ruta de salida con mismo nombre pero extensión .mp4
      const directory = path.dirname(inputPath);
      const fileName = path.basename(inputPath, '.opus');
      const outputPath = path.join(directory, `${fileName}.mp4`);

      console.log(`🔄 Convirtiendo ${path.basename(inputPath)} a MP4...`);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          // Configuración de audio optimizada para speech-to-text
          .audioCodec('aac')           // Codec AAC compatible con MP4
          .audioFrequency(this.sampleRate)  // 16KHz recomendado por Groq
          .audioChannels(this.channels)     // Mono
          .audioBitrate('128k')        // Bitrate moderado
          // Configuración de video (necesario para MP4, pero mínimo)
          .videoCodec('libx264')       // Codec de video H.264
          .videoFilter('color=black:size=320x240:duration=0.1') // Video negro mínimo
          .fps(1)                      // 1 FPS mínimo
          .format('mp4')
          .on('start', (commandLine) => {
            console.log(`📝 Comando FFmpeg: ${commandLine}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`⏳ Progreso: ${Math.round(progress.percent)}% - ${fileName}.mp4`);
            }
          })
          .on('end', () => {
            console.log(`✅ Conversión completada: ${fileName}.mp4`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error(`❌ Error en conversión de ${fileName}: ${err.message}`);
            reject(new Error(`Error convirtiendo ${inputPath}: ${err.message}`));
          })
          .save(outputPath);
      });

    } catch (error) {
      throw new Error(`Error al convertir archivo OPUS: ${error.message}`);
    }
  }

  /**
   * Procesa un archivo de audio: convierte si es .opus o devuelve la ruta original
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processAudioFile(filePath) {
    try {
      if (this.needsConversion(filePath)) {
        console.log(`🔄 Archivo ${path.basename(filePath)} necesita conversión de OPUS a MP4`);
        
        const convertedPath = await this.convertOpusToMp4(filePath);
        
        return {
          success: true,
          originalPath: filePath,
          processedPath: convertedPath,
          wasConverted: true,
          originalFormat: 'opus',
          targetFormat: 'mp4'
        };
      } else {
        console.log(`✅ Archivo ${path.basename(filePath)} ya es compatible`);
        return {
          success: true,
          originalPath: filePath,
          processedPath: filePath,
          wasConverted: false
        };
      }
    } catch (error) {
      return {
        success: false,
        originalPath: filePath,
        error: error.message,
        wasConverted: false
      };
    }
  }

  /**
   * Obtiene información de un archivo de audio usando ffprobe
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Object>} Información del archivo
   */
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Error obteniendo información del audio: ${err.message}`));
        } else {
          const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
          
          resolve({
            duration: parseFloat(metadata.format.duration) || 0,
            format: metadata.format.format_name,
            size: parseInt(metadata.format.size) || 0,
            bitrate: parseInt(metadata.format.bit_rate) || 0,
            audio: audioStream ? {
              codec: audioStream.codec_name,
              sampleRate: parseInt(audioStream.sample_rate) || 0,
              channels: parseInt(audioStream.channels) || 0,
              bitrate: parseInt(audioStream.bit_rate) || 0
            } : null
          });
        }
      });
    });
  }

  /**
   * Valida que FFmpeg esté instalado y disponible
   * @returns {Promise<boolean>} True si FFmpeg está disponible
   */
  async validateFFmpeg() {
    return new Promise((resolve) => {
      ffmpeg()
        .on('error', (err) => {
          console.error('FFmpeg no está disponible:', err.message);
          resolve(false);
        })
        .on('codecData', () => {
          resolve(true);
        })
        .input('dummy')
        .format('null')
        .duration(0.01)
        .save('/dev/null');
    });
  }

  /**
   * Convierte múltiples archivos .opus en un directorio
   * @param {string} directoryPath - Ruta del directorio
   * @returns {Promise<Array>} Resultados de las conversiones
   */
  async convertOpusFilesInDirectory(directoryPath) {
    try {
      const files = await fs.readdir(directoryPath);
      const opusFiles = files.filter(file => path.extname(file).toLowerCase() === '.opus');
      
      console.log(`📁 Encontrados ${opusFiles.length} archivos OPUS en ${directoryPath}`);
      
      const results = [];
      
      for (const file of opusFiles) {
        const filePath = path.join(directoryPath, file);
        const result = await this.processAudioFile(filePath);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      throw new Error(`Error procesando directorio: ${error.message}`);
    }
  }
}

