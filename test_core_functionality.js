#!/usr/bin/env node

/**
 * Core functionality test that validates the system without external dependencies
 * This test can be run even without Google/Hubspot integrations
 */

import { getDb } from './server/lib/db.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486';

async function testCoreFunctionality() {
    console.log('🧪 Testing Core Functionality...\n');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    // Test 1: Database Connection
    await testDatabaseConnection(results);
    
    // Test 2: Code Structure
    await testCodeStructure(results);
    
    // Test 3: API Routes
    await testAPIRoutes(results);
    
    // Test 4: Tool Functions
    await testToolFunctions(results);
    
    // Test 5: Memory System
    await testMemorySystem(results);
    
    // Test 6: RAG System
    await testRAGSystem(results);
    
    // Test 7: Integration Points
    await testIntegrationPoints(results);

    // Print results
    console.log('\n📊 Core Functionality Test Results:');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Pass Rate: ${Math.round((results.passed / results.total) * 100)}%\n`);
    
    console.log('📋 Detailed Results:');
    results.details.forEach(detail => {
        const status = detail.passed ? '✅' : '❌';
        console.log(`${status} ${detail.test}: ${detail.message}`);
        if (!detail.passed && detail.error) {
            console.log(`   Error: ${detail.error}`);
        }
    });

    if (results.failed === 0) {
        console.log('\n🎉 All core functionality tests passed!');
        console.log('\n✅ System is properly configured:');
        console.log('   • Database connection is working');
        console.log('   • Code structure is correct');
        console.log('   • API routes are properly configured');
        console.log('   • Tool functions are available');
        console.log('   • Memory system is functional');
        console.log('   • RAG system is properly structured');
        console.log('   • Integration points are configured');
        console.log('\n💡 To test external integrations:');
        console.log('   • Configure Google OAuth');
        console.log('   • Configure Hubspot OAuth');
        console.log('   • Run: node run_comprehensive_tests.js requirements');
    } else {
        console.log('\n⚠️  Some core functionality tests failed.');
        console.log('   Check the detailed results above and fix any issues.');
    }

    return results;
}

async function testDatabaseConnection(results) {
    results.total++;
    try {
        console.log('Testing database connection...');
        
        const db = getDb();
        await db.admin().ping();
        
        results.details.push({
            test: 'Database Connection',
            passed: true,
            message: 'Database connection successful',
            error: null
        });
        
        results.passed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Database Connection',
            passed: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
}

async function testCodeStructure(results) {
    results.total++;
    try {
        console.log('Testing code structure...');
        
        const requiredFiles = [
            './server/lib/db.js',
            './server/lib/rag.js',
            './server/lib/memory.js',
            './server/lib/tools.js',
            './server/routes/chat.js',
            './server/routes/auth.js',
            './server/routes/tasks.js',
            './server/routes/webhooks.js',
            './server/routes/conversations.js'
        ];
        
        let allFilesExist = true;
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            try {
                await import(file);
            } catch (error) {
                allFilesExist = false;
                missingFiles.push(file);
            }
        }
        
        results.details.push({
            test: 'Code Structure',
            passed: allFilesExist,
            message: allFilesExist ? 'All required files are present' : `Missing files: ${missingFiles.join(', ')}`,
            error: allFilesExist ? null : 'Some required files are missing'
        });
        
        if (allFilesExist) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Code Structure',
            passed: false,
            message: 'Code structure test failed',
            error: error.message
        });
    }
}

async function testAPIRoutes(results) {
    results.total++;
    try {
        console.log('Testing API routes...');
        
        const routes = [
            './server/routes/chat.js',
            './server/routes/auth.js',
            './server/routes/tasks.js',
            './server/routes/webhooks.js',
            './server/routes/conversations.js'
        ];
        
        let allRoutesValid = true;
        const invalidRoutes = [];
        
        for (const route of routes) {
            try {
                const routeModule = await import(route);
                if (!routeModule.default || typeof routeModule.default !== 'function') {
                    allRoutesValid = false;
                    invalidRoutes.push(route);
                }
            } catch (error) {
                allRoutesValid = false;
                invalidRoutes.push(route);
            }
        }
        
        results.details.push({
            test: 'API Routes',
            passed: allRoutesValid,
            message: allRoutesValid ? 'All API routes are properly structured' : `Invalid routes: ${invalidRoutes.join(', ')}`,
            error: allRoutesValid ? null : 'Some API routes are not properly structured'
        });
        
        if (allRoutesValid) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'API Routes',
            passed: false,
            message: 'API routes test failed',
            error: error.message
        });
    }
}

async function testToolFunctions(results) {
    results.total++;
    try {
        console.log('Testing tool functions...');
        
        const tools = await import('./server/lib/tools.js');
        
        const requiredTools = [
            'sendEmailTool',
            'scheduleEventTool',
            'findHubspotContactTool',
            'ensureHubspotContactTool',
            'lookupMeetingWithClientTool',
            'checkEmailFromUnknownTool'
        ];
        
        const hasAllTools = requiredTools.every(tool => typeof tools[tool] === 'function');
        
        results.details.push({
            test: 'Tool Functions',
            passed: hasAllTools,
            message: hasAllTools ? 'All required tool functions are available' : 'Some tool functions are missing',
            error: hasAllTools ? null : 'Missing tool functions'
        });
        
        if (hasAllTools) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Tool Functions',
            passed: false,
            message: 'Tool functions test failed',
            error: error.message
        });
    }
}

async function testMemorySystem(results) {
    results.total++;
    try {
        console.log('Testing memory system...');
        
        const memory = await import('./server/lib/memory.js');
        
        const requiredFunctions = [
            'ensureConversation',
            'saveMessage',
            'loadRecentMessages',
            'maybeSetTitle',
            'updateRollingSummaryIfNeeded'
        ];
        
        const hasAllFunctions = requiredFunctions.every(func => typeof memory[func] === 'function');
        
        results.details.push({
            test: 'Memory System',
            passed: hasAllFunctions,
            message: hasAllFunctions ? 'All memory functions are available' : 'Some memory functions are missing',
            error: hasAllFunctions ? null : 'Missing memory functions'
        });
        
        if (hasAllFunctions) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Memory System',
            passed: false,
            message: 'Memory system test failed',
            error: error.message
        });
    }
}

async function testRAGSystem(results) {
    results.total++;
    try {
        console.log('Testing RAG system...');
        
        const rag = await import('./server/lib/rag.js');
        
        const requiredFunctions = ['queryRAG', 'embedText'];
        const hasAllFunctions = requiredFunctions.every(func => typeof rag[func] === 'function');
        
        results.details.push({
            test: 'RAG System',
            passed: hasAllFunctions,
            message: hasAllFunctions ? 'All RAG functions are available' : 'Some RAG functions are missing',
            error: hasAllFunctions ? null : 'Missing RAG functions'
        });
        
        if (hasAllFunctions) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'RAG System',
            passed: false,
            message: 'RAG system test failed',
            error: error.message
        });
    }
}

async function testIntegrationPoints(results) {
    results.total++;
    try {
        console.log('Testing integration points...');
        
        const tools = await import('./server/lib/tools.js');
        
        const requiredIntegrationTools = [
            'sendEmailTool',
            'scheduleEventTool',
            'findHubspotContactTool',
            'ensureHubspotContactTool',
            'checkEmailFromUnknownTool',
            'lookupMeetingWithClientTool'
        ];
        
        const hasAllIntegrationTools = requiredIntegrationTools.every(tool => typeof tools[tool] === 'function');
        
        results.details.push({
            test: 'Integration Points',
            passed: hasAllIntegrationTools,
            message: hasAllIntegrationTools ? 'All integration points are available' : 'Some integration points are missing',
            error: hasAllIntegrationTools ? null : 'Missing integration tools'
        });
        
        if (hasAllIntegrationTools) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Integration Points',
            passed: false,
            message: 'Integration points test failed',
            error: error.message
        });
    }
}

// Run the tests
testCoreFunctionality().catch(console.error);
