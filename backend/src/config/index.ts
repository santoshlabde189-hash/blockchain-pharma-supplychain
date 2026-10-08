import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'pharma_trace_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  fabricChannel: process.env.FABRIC_CHANNEL || 'pharmachannel',
  fabricChaincode: process.env.FABRIC_CHAINCODE || 'pharma-cc',
  mqttUrl: process.env.MQTT_URL || 'mqtt://localhost:1883',
  minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || 'minio',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minio123',
  nodeEnv: process.env.NODE_ENV || 'development'
};
