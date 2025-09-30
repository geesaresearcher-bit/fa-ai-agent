/**
 * Test script to validate all requirements are working correctly
 * Run with: node test_requirements.js
 */

import { MongoClient } from 'mongodb';
import axios from 'axios';

const BASE_URL = 'http://localhost:4000'; // Adjust if your server runs on different port
const TEST_USER_ID = '68da0805c67f522fa24c1486'; // You'll need to replace with actual user ID

// Test data
const testData = {
    clientEmail: 'geesaresearcher@gmail.com',
    clientName: 'Sara Smith',
    meetingTime: 'tomorrow 2:00pm',
    unknownEmailer: 'pogirag875@mv6a.com',
    unknownEmailerName: 'New Client'
};

async function testRequirement(requirement, testFunction) {
    console.log(`\n🧪 Testing: ${requirement}`);
    try {
        const result = await testFunction();
        if (result.success) {
            console.log(`✅ PASS: ${requirement}`);
            if (result.details) console.log(`   Details: ${result.details}`);
        } else {
            console.log(`❌ FAIL: ${requirement}`);
            console.log(`   Error: ${result.error}`);
        }
        return result.success;
    } catch (error) {
        console.log(`❌ ERROR: ${requirement}`);
        console.log(`   Exception: ${error.message}`);
        return false;
    }
}

async function testEmailHubspotContext() {
    // Test that agent uses email and Hubspot data as context
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: "Tell me about Sara Smith",
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const hasContext = reply.includes('Sara') || reply.includes('client') || reply.includes('contact');
    
    return {
        success: hasContext,
        details: hasContext ? 'Agent used context to answer about client' : 'Agent did not use context',
        error: hasContext ? null : 'Agent response did not show evidence of using email/Hubspot context'
    };
}

async function testScheduleAppointment() {
    // Test appointment scheduling with correct email
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `Schedule an appointment with Sara Smith for ${testData.meetingTime}`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if scheduling was attempted and email was used correctly
    const hasScheduling = toolResults && toolResults.some(tool => tool.name === 'schedule_event');
    const hasEmailNotification = toolResults && toolResults.some(tool => tool.name === 'send_email');
    
    return {
        success: hasScheduling && hasEmailNotification,
        details: hasScheduling ? 'Appointment scheduled and email sent' : 'Scheduling failed',
        error: !hasScheduling ? 'No scheduling tool was called' : !hasEmailNotification ? 'No email notification sent' : null
    };
}

async function testUnknownEmailerContactCreation() {
    // Test that unknown emailers create Hubspot contacts
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `I received an email from ${testData.unknownEmailer} - please handle this`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if contact creation was attempted
    const hasContactCreation = toolResults && toolResults.some(tool => 
        tool.name === 'create_hubspot_contact' || tool.name === 'ensure_hubspot_contact'
    );
    
    return {
        success: hasContactCreation,
        details: hasContactCreation ? 'Contact creation tool was called' : 'No contact creation attempted',
        error: !hasContactCreation ? 'No Hubspot contact creation tool was called' : null
    };
}

async function testWelcomeEmailOnContactCreation() {
    // Test that welcome emails are sent when contacts are created
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `Create a new contact: ${testData.unknownEmailerName} <${testData.unknownEmailer}>`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if both contact creation and welcome email were sent
    const hasContactCreation = toolResults && toolResults.some(tool => 
        tool.name === 'create_hubspot_contact' || tool.name === 'ensure_hubspot_contact'
    );
    const hasWelcomeEmail = toolResults && toolResults.some(tool => 
        tool.name === 'send_email' && tool.content.includes('Thank you')
    );
    
    return {
        success: hasContactCreation && hasWelcomeEmail,
        details: hasContactCreation && hasWelcomeEmail ? 'Contact created and welcome email sent' : 'Missing contact creation or welcome email',
        error: !hasContactCreation ? 'No contact creation' : !hasWelcomeEmail ? 'No welcome email sent' : null
    };
}

async function testCalendarEventNotifications() {
    // Test that calendar events send notifications to attendees
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `Schedule a meeting with ${testData.clientName} <${testData.clientEmail}> for ${testData.meetingTime}`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if both event creation and attendee notifications were sent
    const hasEventCreation = toolResults && toolResults.some(tool => tool.name === 'schedule_event');
    const hasAttendeeNotification = toolResults && toolResults.some(tool => 
        tool.name === 'send_email' && tool.content.includes('Meeting Scheduled')
    );
    
    return {
        success: hasEventCreation && hasAttendeeNotification,
        details: hasEventCreation && hasAttendeeNotification ? 'Event created and attendees notified' : 'Missing event creation or attendee notification',
        error: !hasEventCreation ? 'No event creation' : !hasAttendeeNotification ? 'No attendee notification' : null
    };
}

async function testMeetingLookup() {
    // Test that agent can look up meetings with clients
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `When is my upcoming meeting with ${testData.clientName}?`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if meeting lookup tool was called
    const hasMeetingLookup = toolResults && toolResults.some(tool => 
        tool.name === 'lookup_meeting_with_client' || tool.name === 'get_upcoming_events'
    );
    
    return {
        success: hasMeetingLookup,
        details: hasMeetingLookup ? 'Meeting lookup tool was called' : 'No meeting lookup attempted',
        error: !hasMeetingLookup ? 'No meeting lookup tool was called' : null
    };
}

async function testProactiveAgentProcessing() {
    // Test that the worker processes proactive events
    console.log('   Note: This test requires the worker to be running');
    
    // Simulate an email from unknown sender
    const response = await axios.post(`${BASE_URL}/api/chat/message`, {
        message: `Check for emails from unknown senders and process them`,
        threadId: null
    }, {
        headers: { 'Authorization': `Bearer ${TEST_USER_ID}` }
    });

    const reply = response.data.reply;
    const toolResults = response.data.toolResult;
    
    // Check if proactive agent tools were called
    const hasProactiveProcessing = toolResults && toolResults.some(tool => 
        tool.name === 'check_email_from_unknown' || tool.name === 'proactive_agent'
    );
    
    return {
        success: hasProactiveProcessing,
        details: hasProactiveProcessing ? 'Proactive agent tools were called' : 'No proactive processing',
        error: !hasProactiveProcessing ? 'No proactive agent tools were called' : null
    };
}

async function runAllTests() {
    console.log('🚀 Starting requirement validation tests...\n');
    
    const tests = [
        {
            requirement: 'Agent uses email and Hubspot data as context for client questions',
            test: testEmailHubspotContext
        },
        {
            requirement: 'Appointment scheduling uses correct email addresses and sends notifications',
            test: testScheduleAppointment
        },
        {
            requirement: 'Unknown emailers create Hubspot contacts automatically',
            test: testUnknownEmailerContactCreation
        },
        {
            requirement: 'Welcome emails sent when new contacts are added to Hubspot',
            test: testWelcomeEmailOnContactCreation
        },
        {
            requirement: 'Email notifications sent to attendees when calendar events are created',
            test: testCalendarEventNotifications
        },
        {
            requirement: 'Agent can look up meetings with specific clients',
            test: testMeetingLookup
        },
        {
            requirement: 'Proactive agent processes events automatically',
            test: testProactiveAgentProcessing
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        const passed = await testRequirement(test.requirement, test.test);
        if (passed) passedTests++;
    }

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All requirements are working correctly!');
    } else {
        console.log('⚠️  Some requirements need attention. Check the failed tests above.');
    }
}

// Helper function to check if server is running
async function checkServerHealth() {
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        return response.status === 200;
    } catch (error) {
        console.log('❌ Server is not running or not accessible');
        console.log('   Please start the server with: npm start');
        console.log('   Make sure it\'s running on the correct port');
        return false;
    }
}

// Main execution
async function main() {
    console.log('🔍 Checking server health...');
    const serverHealthy = await checkServerHealth();
    
    if (!serverHealthy) {
        console.log('\n💡 To run these tests:');
        console.log('1. Start the server: npm start');
        console.log('2. Make sure you have a valid user ID in TEST_USER_ID');
        console.log('3. Ensure Google and Hubspot integrations are configured');
        console.log('4. Run this test again: node test_requirements.js');
        return;
    }

    await runAllTests();
}

// Run the tests
main().catch(console.error);
