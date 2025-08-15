import mongoose from 'mongoose';

/**
 * Variables globales para mantener la conexión a MongoDB
 */
declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// Inicializar las variables globales si no existen
if (!global.mongoose) {
  global.mongoose = {
    conn: null,
    promise: null,
  };
}

/**
 * Opciones de conexión a MongoDB
 */
const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Por favor defina la variable de entorno MONGODB_URI dentro de .env.local'
  );
}

/**
 * Opciones de conexión a MongoDB
 */
const options: mongoose.ConnectOptions = {
  bufferCommands: true,
};

/**
 * Función para conectar a MongoDB
 * Reutiliza conexiones existentes para mejorar el rendimiento
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // Si ya tenemos una conexión, la devolvemos
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  // Si ya hay una promesa de conexión en curso, esperamos a que se resuelva
  if (!global.mongoose.promise) {
    const opts = { ...options };

    // Crear una nueva promesa de conexión
    global.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Esperar a que se resuelva la promesa de conexión
    global.mongoose.conn = await global.mongoose.promise;
  } catch (e) {
    // Si hay un error, eliminamos la promesa para intentar de nuevo en la próxima llamada
    global.mongoose.promise = null;
    throw e;
  }

  return global.mongoose.conn;
}

/**
 * Función para desconectar de MongoDB
 * Útil para pruebas y cierre controlado de la aplicación
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (global.mongoose.conn) {
    await global.mongoose.conn.disconnect();
    global.mongoose.conn = null;
    global.mongoose.promise = null;
  }
}

/**
 * Función para verificar el estado de la conexión a MongoDB
 * @returns {boolean} - true si está conectado, false si no
 */
export function isConnected(): boolean {
  return global.mongoose.conn !== null && mongoose.connection.readyState === 1;
}

/**
 * Exportar la instancia de mongoose para uso directo
 */
export { mongoose };
