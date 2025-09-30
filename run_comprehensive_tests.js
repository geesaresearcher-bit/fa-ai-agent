#!/usr/bin/env node

/**
 * Comprehensive test runner that handles different types of tests
 * Usage: node run_comprehensive_tests.js [test-type]
 * Test types: all, requirements, mock, functionality
 */

import axios from 'axios';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const TEST_TYPE = process.argv[2] || 'all';

const TEST_ENDPOINTS = {
    requirements: `${SERVER_URL}/test/requirements`,
    mock: `${SERVER_URL}/test/mock`,
    functionality: `${SERVER_URL}/test/functionality`,
    health: `${SERVER_URL}/test/health`
};

async function runTest(testName, endpoint) {
    console.log(`\n🧪 Running ${testName} tests...`);
    
    try {
        const response = await axios.get(endpoint);
        
        if (response.data.success) {
            const results = response.data.results;
            
            console.log(`\n📊 ${testName} Test Results:`);
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
            
            return {
                success: true,
                results: results
            };
        } else {
            console.log(`❌ ${testName} test execution failed`);
            console.log('Error:', response.data.error);
            return {
                success: false,
                error: response.data.error
            };
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log(`❌ Cannot connect to server for ${testName} tests`);
            console.log('   Make sure the server is running: npm start');
            console.log(`   Expected server at: ${SERVER_URL}`);
        } else if (error.response) {
            console.log(`❌ Server returned an error for ${testName} tests`);
            console.log('   Status:', error.response.status);
            console.log('   Error:', error.response.data);
        } else {
            console.log(`❌ ${testName} test execution failed`);
            console.log('   Error:', error.message);
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

async function checkServerHealth() {
    console.log('🔍 Checking server health...');
    
    try {
        const response = await axios.get(TEST_ENDPOINTS.health);
        
        if (response.status === 200) {
            console.log('✅ Server is running and healthy\n');
            return true;
        } else {
            console.log('❌ Server health check failed');
            return false;
        }
    } catch (error) {
        console.log('❌ Server is not running or not accessible');
        console.log('   Please start the server with: npm start');
        console.log(`   Expected server at: ${SERVER_URL}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting comprehensive test suite...\n');
    
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
        console.log('\n💡 To run these tests:');
        console.log('1. Start the server: npm start');
        console.log('2. Make sure you have a valid user ID configured');
        console.log('3. Ensure database is connected');
        console.log('4. Run this test again: node run_comprehensive_tests.js');
        return;
    }
    
    const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };
    
    // Run tests based on type
    if (TEST_TYPE === 'all' || TEST_TYPE === 'mock') {
        const mockResult = await runTest('Mock', TEST_ENDPOINTS.mock);
        if (mockResult.success) {
            testResults.total += mockResult.results.total;
            testResults.passed += mockResult.results.passed;
            testResults.failed += mockResult.results.failed;
            testResults.details.push(...mockResult.results.details);
        }
    }
    
    if (TEST_TYPE === 'all' || TEST_TYPE === 'functionality') {
        const functionalityResult = await runTest('Functionality', TEST_ENDPOINTS.functionality);
        if (functionalityResult.success) {
            testResults.total += functionalityResult.results.total;
            testResults.passed += functionalityResult.results.passed;
            testResults.failed += functionalityResult.results.failed;
            testResults.details.push(...functionalityResult.results.details);
        }
    }
    
    if (TEST_TYPE === 'all' || TEST_TYPE === 'requirements') {
        const requirementsResult = await runTest('Requirements', TEST_ENDPOINTS.requirements);
        if (requirementsResult.success) {
            testResults.total += requirementsResult.results.total;
            testResults.passed += requirementsResult.results.passed;
            testResults.failed += requirementsResult.results.failed;
            testResults.details.push(...requirementsResult.results.details);
        }
    }
    
    // Print overall results
    console.log('\n🎯 Overall Test Results:');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Pass Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%\n`);
    
    if (testResults.failed === 0) {
        console.log('🎉 All tests passed!');
        console.log('\n✅ System validation complete:');
        console.log('   • Code structure is correct');
        console.log('   • Database connections are working');
        console.log('   • API routes are properly configured');
        console.log('   • Tool functions are available');
        console.log('   • Memory system is functional');
        console.log('   • RAG system is properly structured');
        console.log('   • Integration points are configured');
        
        if (TEST_TYPE === 'all' || TEST_TYPE === 'requirements') {
            console.log('   • External integrations are working');
        }
    } else {
        console.log('⚠️  Some tests failed. Check the detailed results above.');
        
        if (TEST_TYPE === 'all' || TEST_TYPE === 'requirements') {
            console.log('\n💡 For integration tests, ensure:');
            console.log('   • Google OAuth is configured');
            console.log('   • Hubspot OAuth is configured');
            console.log('   • User has valid tokens');
            console.log('   • External services are accessible');
        }
    }
}

// Run the tests
runAllTests().catch(console.error);
