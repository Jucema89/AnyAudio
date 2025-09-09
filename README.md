# 🎙️ AnyAudio

Backend in Node.js to transform audio files to text using FFMEPG, la API de Groq and Whisper.

## 🚀 Características

- ✅ Transcripción de audio a texto multiidioma
- ✅ Traducción de audio a inglés
- ✅ Procesamiento por lotes de archivos
- ✅ Soporte para múltiples formatos de audio
- ✅ API REST completa con Express.js
- ✅ Documentación JSDoc
- ✅ Manejo de errores robusto
- ✅ ES Modules (ESM16)
- ✅ Configuración con variables de entorno

## 📋 Prerrequisitos

- FFMEPG installed, you can install https://www.ffmpeg.org/download.html
- Node.js >= 16.0.0, recomended 18
- Token de Groq API
- npm o yarn

## 🛠️ Instalación

1. **Clona el repositorio** (si aplica) o usa el proyecto actual:
   ```bash
   cd speech-to-text
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   ```

4. **Edita el archivo `.env`** con tu token de Groq:
   ```env
   GROQ_TOKEN=tu_token_real_de_groq
   PORT=3000
   MAX_FILE_SIZE=26214400
   ALLOWED_AUDIO_FORMATS=mp3,wav,m4a,flac,ogg,webm,mp4,mpeg,mpga
   WHISPER_MODEL=whisper-large-v3-turbo
   ```

## 🎯 Uso

### Iniciar el servidor

```bash
# Modo desarrollo (con auto-reload)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

### Estructura de directorios

```
speech-to-text/
├── src/
│   ├── app.js                 # Aplicación principal
│   ├── services/
│   │   └── audioService.js    # Servicio de transcripción
│   ├── routes/
│   │   ├── audioRoutes.js     # Rutas de audio
│   │   └── systemRoutes.js    # Rutas del sistema
│   └── middleware/
│       ├── config.js          # Configuración
│       ├── errorHandler.js    # Manejo de errores
│       └── upload.js          # Subida de archivos
├── audios/                    # Archivos de audio de entrada
├── texts/                     # Transcripciones generadas
├── uploads/                   # Archivos temporales subidos
├── .env                       # Variables de entorno
└── .env.example              # Plantilla de configuración
```

## 📡 API Endpoints

### Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Información general de la API |
| GET | `/api/system/health` | Estado de salud del sistema |
| GET | `/api/system/config` | Configuración del sistema |
| GET | `/api/system/info` | Información detallada |

### Audio

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/audio/transcribe` | Transcribir archivo subido |
| POST | `/api/audio/translate` | Traducir archivo a inglés |
| POST | `/api/audio/process-directory` | Procesar directorio `audios/` |
| GET | `/api/audio/files` | Listar archivos en `audios/` |
| GET | `/api/audio/transcriptions` | Listar transcripciones |
| GET | `/api/audio/transcriptions/:filename` | Obtener transcripción específica |

## 🔧 Ejemplos de uso

### 1. Transcribir un archivo subido

```bash
curl -X POST \
  http://localhost:3000/api/audio/transcribe \
  -F "audio=@mi_archivo.mp3" \
  -F "language=es" \
  -F "saveToFile=true"
```

### 2. Procesar todos los archivos del directorio `audios/`

```bash
curl -X POST \
  http://localhost:3000/api/audio/process-directory \
  -H "Content-Type: application/json" \
  -d '{
    "language": "es",
    "responseFormat": "verbose_json",
    "saveToFiles": true
  }'
```

### 3. Listar archivos de audio disponibles

```bash
curl http://localhost:3000/api/audio/files
```

### 4. Obtener una transcripción específica

```bash
curl http://localhost:3000/api/audio/transcriptions/mi_archivo.txt
```

## ⚙️ Configuración

### Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `GROQ_TOKEN` | Token de autenticación de Groq | *(requerido)* |
| `PORT` | Puerto del servidor | `3000` |
| `MAX_FILE_SIZE` | Tamaño máximo de archivo en bytes | `26214400` (25MB) |
| `ALLOWED_AUDIO_FORMATS` | Formatos de audio permitidos | `mp3,wav,m4a,flac,ogg,webm,mp4,mpeg,mpga` |
| `WHISPER_MODEL` | Modelo de Whisper a usar | `whisper-large-v3-turbo` |

### Modelos disponibles

| Modelo | Descripción | Idiomas | Transcripción | Traducción |
|--------|-------------|---------|---------------|------------|
| `whisper-large-v3` | Alta precisión | Multiidioma | ✅ | ✅ |
| `whisper-large-v3-turbo` | Optimizado para velocidad | Multiidioma | ✅ | ❌ |

## 📝 Parámetros de transcripción

### POST `/api/audio/transcribe`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `audio` | File | Archivo de audio (requerido) |
| `language` | String | Código ISO-639-1 (ej: 'es', 'en') |
| `prompt` | String | Prompt para guiar el estilo |
| `responseFormat` | String | 'json', 'verbose_json', 'text' |
| `timestampGranularities` | String | 'segment', 'word', o ambos |
| `temperature` | Number | Temperatura (0-1) |
| `saveToFile` | Boolean | Guardar en archivo .txt |

### POST `/api/audio/translate`

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `audio` | File | Archivo de audio (requerido) |
| `prompt` | String | Prompt para guiar el estilo |
| `responseFormat` | String | 'json', 'text' |
| `temperature` | Number | Temperatura (0-1) |
| `saveToFile` | Boolean | Guardar en archivo .txt |

## 🐛 Manejo de errores

La API devuelve errores en formato JSON estándar:

```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles adicionales"
}
```

### Códigos de error comunes

- **400**: Archivo inválido o parámetros incorrectos
- **404**: Archivo o ruta no encontrada
- **413**: Archivo demasiado grande
- **500**: Error interno del servidor o de la API de Groq

## 🔒 Formatos de audio soportados

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- FLAC (.flac)
- OGG (.ogg)
- WebM (.webm)
- MP4 (.mp4)
- MPEG (.mpeg)
- MPGA (.mpga)

### Limitaciones

- **Tamaño máximo**: 25MB (free tier) / 100MB (dev tier)
- **Duración mínima**: 0.01 segundos
- **Facturación mínima**: 10 segundos
- **Pistas múltiples**: Solo se transcribe la primera pista

## 🚀 Mejores prácticas

1. **Calidad de audio**: Usa archivos en formato WAV para menor latencia
2. **Tamaño de archivo**: Reduce el tamaño con FLAC para compresión sin pérdida
3. **Preprocesamiento**: Convierte a 16KHz mono para óptimos resultados:
   ```bash
   ffmpeg -i input.mp3 -ar 16000 -ac 1 -c:a flac output.flac
   ```

## 📊 Respuesta de transcripción

### Formato verbose_json

```json
{
  "success": true,
  "data": {
    "transcription": {
      "text": "Texto transcrito completo",
      "segments": [
        {
          "id": 0,
          "start": 0.0,
          "end": 3.2,
          "text": "Fragmento de texto",
          "avg_logprob": -0.12,
          "no_speech_prob": 0.01,
          "compression_ratio": 1.5
        }
      ]
    },
    "metadata": {
      "fileName": "audio.mp3",
      "model": "whisper-large-v3-turbo",
      "language": "es",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push al branch (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📄 Licencia

ISC License

## 🆘 Soporte

Si encuentras algún problema:

1. Verifica que tu token de Groq sea válido
2. Revisa los logs del servidor para errores
3. Consulta la documentación de Groq API
4. Abre un issue en el repositorio

---

¡Hecho con ❤️ usando Node.js y Groq API!
