/**
 * Middleware para manejo centralizado de errores
 * @param {Error} error - Error capturado
 * @param {import('express').Request} req - Objeto request de Express
 * @param {import('express').Response} res - Objeto response de Express
 * @param {import('express').NextFunction} next - Función next de Express
 */
export function errorHandler(error, req, res, next) {
  console.error('Error capturado:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Errores de validación de archivos
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'El archivo es demasiado grande',
      details: 'El tamaño máximo permitido es 25MB',
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Archivo no válido',
      details: 'Solo se permiten archivos de audio',
    });
  }

  // Errores de la API de Groq
  if (error.message.includes('Groq')) {
    return res.status(500).json({
      success: false,
      error: 'Error en el servicio de transcripción',
      details: 'Por favor, intenta de nuevo más tarde',
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
  });
}

/**
 * Middleware para manejar rutas no encontradas
 * @param {import('express').Request} req - Objeto request de Express
 * @param {import('express').Response} res - Objeto response de Express
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    details: `La ruta ${req.method} ${req.url} no existe`,
  });
}
