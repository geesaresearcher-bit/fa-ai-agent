// MongoDB initialization script
db = db.getSiblingDB('fa_agent');

// Create collections if they don't exist
db.createCollection('users');
db.createCollection('conversations');
db.createCollection('tasks');
db.createCollection('sessions');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.conversations.createIndex({ "userId": 1 });
db.tasks.createIndex({ "userId": 1 });
db.tasks.createIndex({ "status": 1 });
db.sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });

print('Database initialized successfully');
