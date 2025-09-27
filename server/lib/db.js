import { MongoClient } from 'mongodb';
let client, db;


async function connectDb() {
    client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 20 });
    await client.connect();
    db = client.db(process.env.DB_NAME || 'fa_agent');
    console.log('MongoDB connected');
    // Ensure indexes (if using Atlas Vector Search, index creation is usually done in Atlas UI or via API)
    await db.collection('documents').createIndex({ user_id: 1 });
    await db.collection('tasks').createIndex({ status: 1 });
    await db.collection('conversations').createIndex({ user_id: 1, updated_at: -1 });
    await db.collection('messages').createIndex({ conversation_id: 1, created_at: 1 });
}


function getDb() { return db; }
export { connectDb, getDb };