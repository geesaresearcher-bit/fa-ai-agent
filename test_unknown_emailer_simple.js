/**
 * Simple test for unknown emailer functionality
 * Run with: node test_unknown_emailer_simple.js
 */

import { getDb } from './server/lib/db.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486'; // Replace with your user ID

async function testUnknownEmailer() {
    console.log('🧪 Testing Unknown Emailer Functionality...\n');
    
    try {
        const db = getDb();
        
        // Check if user exists
        console.log('1. Checking user...');
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(TEST_USER_ID)) });
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        console.log('✅ User found');
        
        // Check Google integration
        console.log('\n2. Checking Google integration...');
        if (!user.google_tokens) {
            console.log('❌ Google tokens not found');
            console.log('   Solution: Connect Gmail in the frontend');
            return;
        }
        console.log('✅ Google tokens found');
        
        // Check Hubspot integration
        console.log('\n3. Checking Hubspot integration...');
        if (!user.hubspot_tokens) {
            console.log('❌ Hubspot tokens not found');
            console.log('   Solution: Connect Hubspot in the frontend');
            return;
        }
        console.log('✅ Hubspot tokens found');
        
        // Check for recent emails
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
            console.log('\n⚠️  No recent emails found. This could be because:');
            console.log('   - No emails received in the last 24 hours');
            console.log('   - Gmail ingestion not working');
            console.log('   - All emails already processed');
            console.log('\n💡 To test:');
            console.log('   1. Send an email to yourself from an unknown address');
            console.log('   2. Wait 2 minutes for worker to process');
            console.log('   3. Run this test again');
            return;
        }
        
        // Show recent emails
        console.log('\nRecent emails:');
        recentEmails.forEach((email, index) => {
            console.log(`   ${index + 1}. From: ${email.from}`);
            console.log(`      Subject: ${email.subject}`);
            console.log(`      Processed: ${email.processed_for_proactive ? 'Yes' : 'No'}`);
            console.log(`      Created: ${email.created_at}`);
            console.log('');
        });
        
        // Check worker status
        console.log('5. Checking worker status...');
        console.log('ℹ️  Worker should be running every 2 minutes');
        console.log('ℹ️  Check server logs for worker activity');
        console.log('ℹ️  Look for messages like: [worker] Processing user: [user_id]');
        
        // Manual trigger instructions
        console.log('\n6. Manual trigger instructions:');
        console.log('   To manually trigger unknown emailer processing:');
        console.log('   curl -X POST http://localhost:4000/test/trigger-unknown-emailer \\');
        console.log('     -H "Authorization: Bearer YOUR_TOKEN"');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testUnknownEmailer().catch(console.error);
