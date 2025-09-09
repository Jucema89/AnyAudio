import express from 'express';
import { AudioService } from '../services/audioService.js';
import { upload, validateFileUpload } from '../middleware/upload.js';
import { config } from '../middleware/config.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Instancia del servicio de audio
const audioService = new AudioService(config.groq.token, config.groq.model);

/**
 * POST /api/audio/transcribe
 * Transcribe un archivo de audio subido por el usuario
 */
router.post('/transcribe', upload.single('audio'), validateFileUpload, async (req, res, next) => {
  try {
    const { file } = req;
    const { 
      language, 
      prompt, 
      responseFormat = 'verbose_json',
      timestampGranularities = 'segment',
      temperature = 0,
      saveToFile = false 
    } = req.body;

    // Convertir timestampGranularities a array si es string
    const granularities = typeof timestampGranularities === 'string' 
      ? timestampGranularities.split(',').map(g => g.trim())
      : timestampGranularities;

    const options = {
      language,
      prompt,
      responseFormat,
      timestampGranularities: granularities,
      temperature: parseFloat(temperature),
    };

    // Transcribir el archivo
    const result = await audioService.transcribeFile(file.path, options);

    // Guardar en archivo si se solicita
    if (saveToFile === 'true' || saveToFile === true) {
      const savedPath = await audioService.saveTranscription(result, config.audio.textsDir);
      result.savedPath = savedPath;
    }

    // Limpiar archivo temporal
    await fs.unlink(file.path);

    res.json({
      success: true,
      data: result,
      message: 'Archivo transcrito exitosamente',
    });

  } catch (error) {
    // Limpiar archivo temporal si existe
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    next(error);
  }
});

/**
 * POST /api/audio/translate
 * Traduce un archivo de audio a inglés
 */
router.post('/translate', upload.single('audio'), validateFileUpload, async (req, res, next) => {
  try {
    const { file } = req;
    const { 
      prompt, 
      responseFormat = 'json',
      temperature = 0,
      saveToFile = false 
    } = req.body;

    const options = {
      prompt,
      responseFormat,
      temperature: parseFloat(temperature),
    };

    // Traducir el archivo
    const result = await audioService.translateFile(file.path, options);

    // Guardar en archivo si se solicita
    if (saveToFile === 'true' || saveToFile === true) {
      const savedPath = await audioService.saveTranscription(result, config.audio.textsDir);
      result.savedPath = savedPath;
    }

    // Limpiar archivo temporal
    await fs.unlink(file.path);

    res.json({
      success: true,
      data: result,
      message: 'Archivo traducido exitosamente',
    });

  } catch (error) {
    // Limpiar archivo temporal si existe
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error al eliminar archivo temporal:', unlinkError);
      }
    }
    next(error);
  }
});

/**
 * POST /api/audio/process-directory
 * Procesa todos los archivos de audio en el directorio 'audios'
 */
router.post('/process-directory', async (req, res, next) => {
  try {
    const { 
      language, 
      prompt, 
      responseFormat = 'verbose_json',
      timestampGranularities = 'segment',
      temperature = 0,
      saveToFiles = true 
    } = req.body;

    // Convertir timestampGranularities a array si es string
    const granularities = typeof timestampGranularities === 'string' 
      ? timestampGranularities.split(',').map(g => g.trim())
      : timestampGranularities;

    const options = {
      language,
      prompt,
      responseFormat,
      timestampGranularities: granularities,
      temperature: parseFloat(temperature),
    };

    const outputDirectory = saveToFiles ? config.audio.textsDir : null;

    // Procesar directorio de audios
    const results = await audioService.processAudioDirectory(
      config.audio.audioDir, 
      options, 
      outputDirectory
    );

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount,
        }
      },
      message: `Procesados ${results.length} archivos. ${successCount} exitosos, ${errorCount} fallidos.`,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/files
 * Lista todos los archivos de audio en el directorio 'audios'
 */
router.get('/files', async (req, res, next) => {
  try {
    const files = await fs.readdir(config.audio.audioDir);
    
    const audioFiles = [];
    
    for (const file of files) {
      const filePath = path.join(config.audio.audioDir, file);
      
      if (AudioService.isValidAudioFile(filePath)) {
        const fileInfo = await AudioService.getFileInfo(filePath);
        audioFiles.push(fileInfo);
      }
    }

    res.json({
      success: true,
      data: {
        files: audioFiles,
        count: audioFiles.length,
      },
      message: `Encontrados ${audioFiles.length} archivos de audio`,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/transcriptions
 * Lista todas las transcripciones en el directorio 'texts'
 */
router.get('/transcriptions', async (req, res, next) => {
  try {
    const files = await fs.readdir(config.audio.textsDir);
    const transcriptionFiles = files.filter(file => file.endsWith('.txt'));

    const transcriptions = [];

    for (const file of transcriptionFiles) {
      const filePath = path.join(config.audio.textsDir, file);
      const stats = await fs.stat(filePath);
      
      transcriptions.push({
        name: file,
        size: stats.size,
        lastModified: stats.mtime,
        path: filePath,
      });
    }

    res.json({
      success: true,
      data: {
        transcriptions,
        count: transcriptions.length,
      },
      message: `Encontradas ${transcriptions.length} transcripciones`,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/transcriptions/:filename
 * Obtiene el contenido de una transcripción específica
 */
router.get('/transcriptions/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(config.audio.textsDir, filename);

    // Verificar que el archivo existe y es un archivo de texto
    if (!filename.endsWith('.txt')) {
      return res.status(400).json({
        success: false,
        error: 'Archivo no válido',
        details: 'Solo se pueden leer archivos .txt',
      });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);

    res.json({
      success: true,
      data: {
        filename,
        content,
        size: stats.size,
        lastModified: stats.mtime,
      },
      message: 'Transcripción obtenida exitosamente',
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado',
        details: 'La transcripción solicitada no existe',
      });
    }
    next(error);
  }
});

export default router;
