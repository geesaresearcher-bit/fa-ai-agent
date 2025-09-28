import { MongoClient } from 'mongodb';
let client, db;


async function connectDb() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    
    client = new MongoClient(process.env.MONGODB_URI, { 
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    await client.connect();
    db = client.db(process.env.DB_NAME || 'fa_agent');
    console.log('MongoDB connected to database:', process.env.DB_NAME || 'fa_agent');
    
    // Ensure indexes (if using Atlas Vector Search, index creation is usually done in Atlas UI or via API)
    try {
        await db.collection('documents').createIndex({ user_id: 1 });
        await db.collection('tasks').createIndex({ status: 1 });
        await db.collection('conversations').createIndex({ user_id: 1, updated_at: -1 });
        await db.collection('messages').createIndex({ conversation_id: 1, created_at: 1 });
        console.log('Database indexes created successfully');
    } catch (indexError) {
        console.warn('Some indexes could not be created:', indexError.message);
    }
}


function getDb() { return db; }
export { connectDb, getDb };