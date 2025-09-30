#!/usr/bin/env node

/**
 * Test runner script to validate all requirements
 * Usage: node run_tests.js
 */

import axios from 'axios';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const TEST_ENDPOINT = `${SERVER_URL}/test/requirements`;

async function runTests() {
    console.log('🚀 Starting requirement validation tests...\n');
    
    try {
        // Check if server is running
        console.log('🔍 Checking server health...');
        const healthResponse = await axios.get(`${SERVER_URL}/health`);
        
        if (healthResponse.status !== 200) {
            throw new Error('Server health check failed');
        }
        
        console.log('✅ Server is running\n');
        
        // Run the tests
        console.log('🧪 Running integration tests...');
        const testResponse = await axios.get(TEST_ENDPOINT);
        
        if (testResponse.data.success) {
            const results = testResponse.data.results;
            
            console.log('\n📊 Test Results:');
            console.log(`Total Tests: ${results.total}`);
            console.log(`Passed: ${results.passed}`);
            console.log(`Failed: ${results.failed}`);
            console.log(`Pass Rate: ${results.passRate}\n`);
            
            console.log('📋 Detailed Results:');
            results.details.forEach(detail => {
                const status = detail.passed ? '✅' : '❌';
                console.log(`${status} ${detail.test}`);
                console.log(`   ${detail.message}`);
                if (!detail.passed && detail.error) {
                    console.log(`   Error: ${detail.error}`);
                }
                console.log('');
            });
            
            if (results.failed === 0) {
                console.log('🎉 All requirements are working correctly!');
                console.log('\n✅ Requirements validated:');
                console.log('   • Agent uses email and Hubspot data as context');
                console.log('   • Appointment scheduling uses correct email addresses');
                console.log('   • Unknown emailers create Hubspot contacts automatically');
                console.log('   • Welcome emails sent when contacts are created');
                console.log('   • Calendar events send notifications to attendees');
                console.log('   • Agent can look up meetings with specific clients');
                console.log('   • Proactive agent processes events automatically');
            } else {
                console.log('⚠️  Some requirements need attention.');
                console.log('   Check the failed tests above and refer to the manual testing guide.');
            }
            
        } else {
            console.log('❌ Test execution failed');
            console.log('Error:', testResponse.data.error);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Cannot connect to server');
            console.log('   Make sure the server is running: npm start');
            console.log(`   Expected server at: ${SERVER_URL}`);
        } else if (error.response) {
            console.log('❌ Server returned an error');
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data);
        } else {
            console.log('❌ Test execution failed');
            console.log('   Error:', error.message);
        }
    }
}

// Run the tests
runTests().catch(console.error);
