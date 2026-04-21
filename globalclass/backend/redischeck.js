import { createClient } from 'redis';

const client = createClient({
    url: 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Error:', err));

await client.connect();

console.log('Redis connected');

// test
await client.set('name', 'karthik');
console.log(await client.get('name'));