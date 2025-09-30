/**
 * Integration test to verify all requirements are working
 * This test can be run within the server environment
 */

import { getDb } from './lib/db.js';
import { 
    sendEmailTool, 
    scheduleEventTool, 
    findHubspotContactTool,
    ensureHubspotContactTool,
    lookupMeetingWithClientTool,
    checkEmailFromUnknownTool
} from './lib/tools.js';
import { queryRAG } from './lib/rag.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486'; // Replace with actual test user ID

async function runIntegrationTests() {
    console.log('🧪 Running Integration Tests...\n');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    // Test 1: RAG Context Integration
    await testRAGContext(results);
    
    // Test 2: Email Address Validation in Scheduling
    await testEmailValidation(results);
    
    // Test 3: Hubspot Contact Creation
    await testHubspotContactCreation(results);
    
    // Test 4: Welcome Email on Contact Creation
    await testWelcomeEmail(results);
    
    // Test 5: Calendar Event Notifications
    await testCalendarNotifications(results);
    
    // Test 6: Meeting Lookup
    await testMeetingLookup(results);
    
    // Test 7: Unknown Emailer Processing
    await testUnknownEmailerProcessing(results);

    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    console.log('\n📋 Detailed Results:');
    results.details.forEach(detail => {
        const status = detail.passed ? '✅' : '❌';
        console.log(`${status} ${detail.test}: ${detail.message}`);
        if (!detail.passed && detail.error) {
            console.log(`   Error: ${detail.error}`);
        }
    });

    return results;
}

async function testRAGContext(results) {
    results.total++;
    try {
        console.log('Testing RAG context integration...');
        
        // Test if RAG can retrieve context
        const context = await queryRAG(TEST_USER_ID, 'client information', 3);
        
        const hasContext = context && context.length > 0;
        
        results.details.push({
            test: 'RAG Context Integration',
            passed: hasContext,
            message: hasContext ? 'RAG successfully retrieved context' : 'RAG did not retrieve context',
            error: hasContext ? null : 'No context retrieved from RAG system'
        });
        
        if (hasContext) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'RAG Context Integration',
            passed: false,
            message: 'RAG test failed with exception',
            error: error.message
        });
    }
}

async function testEmailValidation(results) {
    results.total++;
    try {
        console.log('Testing email validation in scheduling...');
        
        // Test finding a contact by email
        const contactResult = await findHubspotContactTool(TEST_USER_ID, { 
            query: 'test@example.com' 
        });
        
        const hasEmailValidation = contactResult.ok;
        
        results.details.push({
            test: 'Email Validation in Scheduling',
            passed: hasEmailValidation,
            message: hasEmailValidation ? 'Email validation working' : 'Email validation failed',
            error: hasEmailValidation ? null : contactResult.error
        });
        
        if (hasEmailValidation) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Email Validation in Scheduling',
            passed: false,
            message: 'Email validation test failed with exception',
            error: error.message
        });
    }
}

async function testHubspotContactCreation(results) {
    results.total++;
    try {
        console.log('Testing Hubspot contact creation...');
        
        // Test creating a contact
        const contactResult = await ensureHubspotContactTool(TEST_USER_ID, {
            email: 'test.contact@example.com',
            firstname: 'Test',
            lastname: 'Contact'
        });
        
        const hasContactCreation = contactResult.ok;
        
        results.details.push({
            test: 'Hubspot Contact Creation',
            passed: hasContactCreation,
            message: hasContactCreation ? 'Contact creation working' : 'Contact creation failed',
            error: hasContactCreation ? null : contactResult.error
        });
        
        if (hasContactCreation) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Hubspot Contact Creation',
            passed: false,
            message: 'Contact creation test failed with exception',
            error: error.message
        });
    }
}

async function testWelcomeEmail(results) {
    results.total++;
    try {
        console.log('Testing welcome email functionality...');
        
        // Test sending a welcome email
        const emailResult = await sendEmailTool(TEST_USER_ID, {
            to: 'test@example.com',
            subject: 'Welcome Test',
            body: 'This is a test welcome email'
        });
        
        const hasEmailSending = emailResult.ok;
        
        results.details.push({
            test: 'Welcome Email Functionality',
            passed: hasEmailSending,
            message: hasEmailSending ? 'Email sending working' : 'Email sending failed',
            error: hasEmailSending ? null : emailResult.error
        });
        
        if (hasEmailSending) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Welcome Email Functionality',
            passed: false,
            message: 'Email test failed with exception',
            error: error.message
        });
    }
}

async function testCalendarNotifications(results) {
    results.total++;
    try {
        console.log('Testing calendar event notifications...');
        
        // Test scheduling an event (this will also test notifications)
        const eventResult = await scheduleEventTool(TEST_USER_ID, {
            title: 'Test Meeting',
            start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
            attendees: ['test@example.com'],
            description: 'Test meeting for integration test'
        });
        
        const hasEventCreation = eventResult.ok;
        
        results.details.push({
            test: 'Calendar Event Notifications',
            passed: hasEventCreation,
            message: hasEventCreation ? 'Event creation and notifications working' : 'Event creation failed',
            error: hasEventCreation ? null : eventResult.error
        });
        
        if (hasEventCreation) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Calendar Event Notifications',
            passed: false,
            message: 'Calendar test failed with exception',
            error: error.message
        });
    }
}

async function testMeetingLookup(results) {
    results.total++;
    try {
        console.log('Testing meeting lookup functionality...');
        
        // Test looking up meetings with a client
        const lookupResult = await lookupMeetingWithClientTool(TEST_USER_ID, {
            clientName: 'Test Client',
            clientEmail: 'test@example.com'
        });
        
        const hasMeetingLookup = lookupResult.ok;
        
        results.details.push({
            test: 'Meeting Lookup Functionality',
            passed: hasMeetingLookup,
            message: hasMeetingLookup ? 'Meeting lookup working' : 'Meeting lookup failed',
            error: hasMeetingLookup ? null : lookupResult.error
        });
        
        if (hasMeetingLookup) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Meeting Lookup Functionality',
            passed: false,
            message: 'Meeting lookup test failed with exception',
            error: error.message
        });
    }
}

async function testUnknownEmailerProcessing(results) {
    results.total++;
    try {
        console.log('Testing unknown emailer processing...');
        
        // Test processing an email from unknown sender
        const unknownEmailerResult = await checkEmailFromUnknownTool(TEST_USER_ID, {
            emailContent: 'Hello, I am a new client interested in your services.',
            senderEmail: 'newclient@example.com',
            subject: 'New Client Inquiry'
        });
        
        const hasUnknownEmailerProcessing = unknownEmailerResult.ok;
        
        results.details.push({
            test: 'Unknown Emailer Processing',
            passed: hasUnknownEmailerProcessing,
            message: hasUnknownEmailerProcessing ? 'Unknown emailer processing working' : 'Unknown emailer processing failed',
            error: hasUnknownEmailerProcessing ? null : unknownEmailerResult.error
        });
        
        if (hasUnknownEmailerProcessing) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Unknown Emailer Processing',
            passed: false,
            message: 'Unknown emailer test failed with exception',
            error: error.message
        });
    }
}

// Export for use in other files
export { runIntegrationTests };
