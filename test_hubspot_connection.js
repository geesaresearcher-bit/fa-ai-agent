/**
 * Test Hubspot connection to diagnose 401 errors
 * Run with: node test_hubspot_connection.js
 */

import { getDb } from './server/lib/db.js';
import { findHubspotContactTool } from './server/lib/tools.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486'; // Replace with your user ID

async function testHubspotConnection() {
    console.log('🧪 Testing Hubspot Connection...\n');
    
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
        
        // Check Hubspot tokens
        console.log('\n2. Checking Hubspot tokens...');
        if (!user.hubspot_tokens) {
            console.log('❌ Hubspot tokens not found');
            console.log('   Solution: Connect Hubspot in the frontend');
            return;
        }
        console.log('✅ Hubspot tokens found');
        
        // Check token structure
        console.log('\n3. Checking token structure...');
        const tokens = user.hubspot_tokens;
        console.log('Token structure:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            hasExpiresIn: !!tokens.expires_in,
            hasTokenType: !!tokens.token_type
        });
        
        if (!tokens.access_token) {
            console.log('❌ Access token missing');
            console.log('   Solution: Reconnect Hubspot in the frontend');
            return;
        }
        
        // Test Hubspot API call
        console.log('\n4. Testing Hubspot API call...');
        console.log('Testing with query: "test"');
        
        const result = await findHubspotContactTool(TEST_USER_ID, { query: 'test' });
        
        console.log('\n5. API call result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.ok) {
            console.log('\n✅ SUCCESS: Hubspot connection is working');
            console.log(`   - Found ${result.results?.length || 0} contacts`);
            console.log('   - API call successful');
        } else {
            console.log('\n❌ ERROR: Hubspot connection failed');
            console.log(`   - Error: ${result.error}`);
            
            if (result.error.includes('401')) {
                console.log('\n🔧 401 Error Solutions:');
                console.log('   1. Reconnect Hubspot in the frontend');
                console.log('   2. Check Hubspot app credentials');
                console.log('   3. Verify Hubspot app has correct scopes');
                console.log('   4. Check if tokens are expired');
            } else if (result.error.includes('403')) {
                console.log('\n🔧 403 Error Solutions:');
                console.log('   1. Check Hubspot app permissions');
                console.log('   2. Verify Hubspot app has correct scopes');
                console.log('   3. Check if user has access to Hubspot');
            } else if (result.error.includes('429')) {
                console.log('\n🔧 429 Error Solutions:');
                console.log('   1. Wait and retry (rate limiting)');
                console.log('   2. Check Hubspot rate limits');
                console.log('   3. Reduce API call frequency');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testHubspotConnection().catch(console.error);
