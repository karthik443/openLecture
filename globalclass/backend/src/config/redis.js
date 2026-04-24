import { createClient } from 'redis';

// Factory — creates and connects a new Redis client.
// Called once for the shared command client (default export)
// and once more for the dedicated Pub/Sub subscriber in qaHandler.
export function createRedisClient() {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
    },
  });
  client.on('error', (err) => console.error('Redis error:', err));
  client.connect();
  return client;
}

// Shared command client (used by qaService for data reads/writes)
const client = createRedisClient();
client.on('connect', () => console.log('Redis connected'));

export default client;
