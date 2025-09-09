import multer from 'multer';
import path from 'path';
import { config } from './config.js';

/**
 * Configuración de almacenamiento para multer
 */
const storage = multer.diskStorage({
  /**
   * Destino donde se guardarán los archivos subidos
   * @param {import('express').Request} req - Request object
   * @param {Express.Multer.File} file - Archivo subido
   * @param {Function} cb - Callback function
   */
  destination: function (req, file, cb) {
    cb(null, config.audio.uploadsDir);
  },

  /**
   * Nombre del archivo a guardar
   * @param {import('express').Request} req - Request object
   * @param {Express.Multer.File} file - Archivo subido
   * @param {Function} cb - Callback function
   */
  filename: function (req, file, cb) {
    // Generar nombre único con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

/**
 * Filtro para validar tipos de archivo
 * @param {import('express').Request} req - Request object
 * @param {Express.Multer.File} file - Archivo subido
 * @param {Function} cb - Callback function
 */
function fileFilter(req, file, cb) {
  // Obtener extensión del archivo
  const extension = path.extname(file.originalname).toLowerCase().substring(1);
  
  // Verificar si la extensión está en la lista de formatos permitidos
  if (config.audio.allowedFormats.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de archivo no soportado. Formatos permitidos: ${config.audio.allowedFormats.join(', ')}`), false);
  }
}

/**
 * Configuración de multer para subida de archivos
 */
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.audio.maxFileSize, // Límite de tamaño de archivo
  },
  fileFilter: fileFilter,
});

/**
 * Middleware para validar que se haya subido un archivo
 * @param {import('express').Request} req - Request object
 * @param {import('express').Response} res - Response object
 * @param {import('express').NextFunction} next - Next function
 */
export function validateFileUpload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No se ha subido ningún archivo',
      details: 'Se requiere un archivo de audio para la transcripción',
    });
  }
  next();
}
