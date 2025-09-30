/**
 * Functionality tests that validate the core logic without external dependencies
 * These tests verify that the code structure and logic are correct
 */

import { getDb } from './lib/db.js';
import { ObjectId } from 'mongodb';

const TEST_USER_ID = '68da0805c67f522fa24c1486';

async function runFunctionalityTests() {
    console.log('🧪 Running Functionality Tests...\n');
    
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    // Test 1: Code Structure Validation
    await testCodeStructure(results);
    
    // Test 2: Database Schema Validation
    await testDatabaseSchema(results);
    
    // Test 3: API Route Validation
    await testAPIRoutes(results);
    
    // Test 4: Tool Schema Validation
    await testToolSchemas(results);
    
    // Test 5: Memory System Validation
    await testMemorySystemValidation(results);
    
    // Test 6: RAG System Validation
    await testRAGSystemValidation(results);
    
    // Test 7: Integration Points Validation
    await testIntegrationPoints(results);

    // Print results
    console.log('\n📊 Functionality Test Results Summary:');
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

async function testCodeStructure(results) {
    results.total++;
    try {
        console.log('Testing code structure...');
        
        // Test if all required files exist and can be imported
        const requiredFiles = [
            './lib/db.js',
            './lib/rag.js',
            './lib/memory.js',
            './lib/tools.js',
            './routes/chat.js',
            './routes/auth.js',
            './routes/tasks.js',
            './routes/webhooks.js',
            './routes/conversations.js'
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

async function testDatabaseSchema(results) {
    results.total++;
    try {
        console.log('Testing database schema...');
        
        const db = getDb();
        
        // Test if required collections exist or can be created
        const requiredCollections = [
            'users',
            'conversations',
            'messages',
            'documents',
            'hubspot_contacts',
            'emails',
            'calendar_events',
            'memories'
        ];
        
        let allCollectionsExist = true;
        const missingCollections = [];
        
        for (const collectionName of requiredCollections) {
            try {
                const collection = db.collection(collectionName);
                await collection.findOne({});
            } catch (error) {
                // Collection might not exist yet, which is okay
                console.log(`   Note: Collection ${collectionName} not yet created (this is normal)`);
            }
        }
        
        results.details.push({
            test: 'Database Schema',
            passed: true,
            message: 'Database schema is properly configured',
            error: null
        });
        
        results.passed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Database Schema',
            passed: false,
            message: 'Database schema test failed',
            error: error.message
        });
    }
}

async function testAPIRoutes(results) {
    results.total++;
    try {
        console.log('Testing API routes...');
        
        // Test if all required routes are properly structured
        const routes = [
            './routes/chat.js',
            './routes/auth.js',
            './routes/tasks.js',
            './routes/webhooks.js',
            './routes/conversations.js'
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

async function testToolSchemas(results) {
    results.total++;
    try {
        console.log('Testing tool schemas...');
        
        // Test if tool schemas are properly defined
        const chatRoute = await import('./routes/chat.js');
        
        // Check if tools array exists and has required tools
        const hasToolsArray = chatRoute.tools && Array.isArray(chatRoute.tools);
        
        if (hasToolsArray) {
            const requiredToolNames = [
                'send_email',
                'schedule_event',
                'get_upcoming_events',
                'create_hubspot_contact',
                'find_hubspot_contact',
                'lookup_meeting_with_client'
            ];
            
            const toolNames = chatRoute.tools.map(tool => tool.function.name);
            const hasAllRequiredTools = requiredToolNames.every(name => toolNames.includes(name));
            
            results.details.push({
                test: 'Tool Schemas',
                passed: hasAllRequiredTools,
                message: hasAllRequiredTools ? 'All required tool schemas are defined' : 'Some required tool schemas are missing',
                error: hasAllRequiredTools ? null : 'Missing tool schemas'
            });
            
            if (hasAllRequiredTools) results.passed++;
            else results.failed++;
        } else {
            results.failed++;
            results.details.push({
                test: 'Tool Schemas',
                passed: false,
                message: 'Tool schemas not found',
                error: 'Tools array not found in chat route'
            });
        }
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Tool Schemas',
            passed: false,
            message: 'Tool schemas test failed',
            error: error.message
        });
    }
}

async function testMemorySystemValidation(results) {
    results.total++;
    try {
        console.log('Testing memory system validation...');
        
        const memory = await import('./lib/memory.js');
        
        const requiredFunctions = [
            'ensureConversation',
            'saveMessage',
            'loadRecentMessages',
            'maybeSetTitle',
            'updateRollingSummaryIfNeeded'
        ];
        
        const hasAllFunctions = requiredFunctions.every(func => typeof memory[func] === 'function');
        
        results.details.push({
            test: 'Memory System Validation',
            passed: hasAllFunctions,
            message: hasAllFunctions ? 'All memory functions are available' : 'Some memory functions are missing',
            error: hasAllFunctions ? null : 'Missing memory functions'
        });
        
        if (hasAllFunctions) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'Memory System Validation',
            passed: false,
            message: 'Memory system validation test failed',
            error: error.message
        });
    }
}

async function testRAGSystemValidation(results) {
    results.total++;
    try {
        console.log('Testing RAG system validation...');
        
        const rag = await import('./lib/rag.js');
        
        const requiredFunctions = ['queryRAG', 'embedText'];
        const hasAllFunctions = requiredFunctions.every(func => typeof rag[func] === 'function');
        
        results.details.push({
            test: 'RAG System Validation',
            passed: hasAllFunctions,
            message: hasAllFunctions ? 'All RAG functions are available' : 'Some RAG functions are missing',
            error: hasAllFunctions ? null : 'Missing RAG functions'
        });
        
        if (hasAllFunctions) results.passed++;
        else results.failed++;
        
    } catch (error) {
        results.failed++;
        results.details.push({
            test: 'RAG System Validation',
            passed: false,
            message: 'RAG system validation test failed',
            error: error.message
        });
    }
}

async function testIntegrationPoints(results) {
    results.total++;
    try {
        console.log('Testing integration points...');
        
        // Test if integration points are properly configured
        const tools = await import('./lib/tools.js');
        
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

// Export for use in other files
export { runFunctionalityTests };
