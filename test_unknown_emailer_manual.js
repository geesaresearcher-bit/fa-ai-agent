/**
 * Manual test for unknown emailer functionality
 * This simulates the worker processing an email from an unknown sender
 */

import { getDb } from './server/lib/db.js';
import { checkEmailFromUnknownTool } from './server/lib/tools.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486'; // Replace with your user ID

async function testUnknownEmailerManual() {
    console.log('🧪 Manual Test: Unknown Emailer Processing\n');
    
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
        
        // Check integrations
        console.log('\n2. Checking integrations...');
        if (!user.google_tokens) {
            console.log('❌ Google tokens not found');
            return;
        }
        if (!user.hubspot_tokens) {
            console.log('❌ Hubspot tokens not found');
            return;
        }
        console.log('✅ Both integrations connected');
        
        // Simulate an email from unknown sender
        console.log('\n3. Simulating unknown emailer...');
        const testEmail = {
            from: 'test@example.com',
            subject: 'Test Email from Unknown Sender',
            content: 'This is a test email from an unknown sender. Please process this email.'
        };
        
        console.log(`Testing with email from: ${testEmail.from}`);
        console.log(`Subject: ${testEmail.subject}`);
        
        // Test the unknown emailer function
        const result = await checkEmailFromUnknownTool(TEST_USER_ID, {
            emailContent: testEmail.content,
            senderEmail: testEmail.from,
            subject: testEmail.subject
        });
        
        console.log('\n4. Processing result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.ok && result.isUnknownSender) {
            console.log('\n✅ SUCCESS: Unknown sender detected and processed');
            console.log(`   - Contact created: ${result.contactCreated}`);
            console.log(`   - Welcome email sent: ${result.welcomeEmailSent}`);
            console.log(`   - Contact ID: ${result.contactId}`);
            console.log(`   - Actions: ${result.actions?.join(', ')}`);
        } else if (result.ok && !result.isUnknownSender) {
            console.log('\nℹ️  INFO: Sender is already a known contact');
            console.log(`   - Existing contact: ${result.existingContact?.email}`);
        } else {
            console.log('\n❌ ERROR: Processing failed');
            console.log(`   - Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testUnknownEmailerManual().catch(console.error);
