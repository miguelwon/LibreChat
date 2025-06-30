require('dotenv').config();
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable');
}

let justinaConn = null;
let connectionPromise = null;

async function connectJustinaDb() {
  if (justinaConn && justinaConn.readyState === 1) {
    return justinaConn;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  try {
    const uri = new URL(MONGO_URI);
    uri.pathname = '/justina';
    const justinaUri = uri.toString();

    const newConnection = mongoose.createConnection(justinaUri, {
      bufferCommands: false,
    });

    connectionPromise = newConnection.asPromise();
    justinaConn = await connectionPromise;

    justinaConn.on('error', (err) => {
      console.error('Justina DB connection error:', err);
      justinaConn = null;
      connectionPromise = null;
    });

    console.log('Successfully connected to Justina DB');

    return justinaConn;
  } catch (error) {
    console.error('Failed to create Justina DB connection:', error);
    connectionPromise = null;
    throw error;
  }
}

module.exports = {
  connectJustinaDb,
}; 