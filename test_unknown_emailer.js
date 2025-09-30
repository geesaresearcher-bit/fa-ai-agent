/**
 * Test script to manually test unknown emailer processing
 * Run with: node test_unknown_emailer.js
 */

import { getDb } from './server/lib/db.js';
import { checkEmailFromUnknownTool } from './server/lib/tools.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486'; // Replace with your user ID

async function testUnknownEmailerProcessing() {
    console.log('🧪 Testing Unknown Emailer Processing...\n');
    
    try {
        // Test 1: Check if user exists
        console.log('1. Checking if user exists...');
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(TEST_USER_ID)) });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        console.log('✅ User found');
        
        // Test 2: Check if user has Google tokens
        console.log('\n2. Checking Google integration...');
        if (!user.google_tokens) {
            console.log('❌ Google tokens not found - need to connect Gmail');
            return;
        }
        console.log('✅ Google tokens found');
        
        // Test 3: Check if user has Hubspot tokens
        console.log('\n3. Checking Hubspot integration...');
        if (!user.hubspot_tokens) {
            console.log('❌ Hubspot tokens not found - need to connect Hubspot');
            return;
        }
        console.log('✅ Hubspot tokens found');
        
        // Test 4: Check for recent emails
        console.log('\n4. Checking for recent emails...');
        const recentEmails = await db.collection('emails')
            .find({ 
                user_id: new ObjectId(String(TEST_USER_ID)), 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
            .sort({ created_at: -1 })
            .limit(5)
            .toArray();
        
        console.log(`Found ${recentEmails.length} recent emails`);
        
        if (recentEmails.length === 0) {
            console.log('⚠️  No recent emails found. This could be because:');
            console.log('   - No emails received in the last 24 hours');
            console.log('   - Gmail ingestion not working');
            console.log('   - All emails already processed');
            return;
        }
        
        // Test 5: Process each email
        console.log('\n5. Processing emails...');
        for (const email of recentEmails) {
            console.log(`\nProcessing email from: ${email.from}`);
            console.log(`Subject: ${email.subject}`);
            
            const result = await checkEmailFromUnknownTool(TEST_USER_ID, {
                emailContent: email.content,
                senderEmail: email.from,
                subject: email.subject
            });
            
            console.log('Result:', JSON.stringify(result, null, 2));
            
            if (result.ok && result.isUnknownSender) {
                console.log('✅ Unknown sender detected and processed');
            } else if (result.ok && !result.isUnknownSender) {
                console.log('ℹ️  Sender is already known');
            } else {
                console.log('❌ Processing failed:', result.error);
            }
        }
        
        // Test 6: Check if worker is running
        console.log('\n6. Checking worker status...');
        console.log('ℹ️  Worker should be running every 2 minutes');
        console.log('ℹ️  Check server logs for worker activity');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testUnknownEmailerProcessing().catch(console.error);
