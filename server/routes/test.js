import express from 'express';
import { runIntegrationTests } from '../test_integration.js';
import { runMockTests } from '../test_mock.js';
import { runFunctionalityTests } from '../test_functionality.js';
import { getDb } from '../lib/db.js';

const router = express.Router();

// Test endpoint to verify all requirements
router.get('/requirements', async (req, res) => {
    try {
        console.log('🧪 Running requirement validation tests...');
        const results = await runIntegrationTests();
        
        res.json({
            success: true,
            results: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                passRate: `${Math.round((results.passed / results.total) * 100)}%`,
                details: results.details
            }
        });
    } catch (error) {
        console.error('Test execution failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test execution failed',
            message: error.message
        });
    }
});

// Mock tests endpoint (no external dependencies)
router.get('/mock', async (req, res) => {
    try {
        console.log('🧪 Running mock tests...');
        const results = await runMockTests();
        
        res.json({
            success: true,
            results: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                passRate: `${Math.round((results.passed / results.total) * 100)}%`,
                details: results.details
            }
        });
    } catch (error) {
        console.error('Mock test execution failed:', error);
        res.status(500).json({
            success: false,
            error: 'Mock test execution failed',
            message: error.message
        });
    }
});

// Functionality tests endpoint
router.get('/functionality', async (req, res) => {
    try {
        console.log('🧪 Running functionality tests...');
        const results = await runFunctionalityTests();
        
        res.json({
            success: true,
            results: {
                total: results.total,
                passed: results.passed,
                failed: results.failed,
                passRate: `${Math.round((results.passed / results.total) * 100)}%`,
                details: results.details
            }
        });
    } catch (error) {
        console.error('Functionality test execution failed:', error);
        res.status(500).json({
            success: false,
            error: 'Functionality test execution failed',
            message: error.message
        });
    }
});

// Quick health check endpoint
router.get('/health', async (req, res) => {
    try {
        const db = getDb();
        await db.admin().ping();
        
        res.json({
            success: true,
            message: 'Server is healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

export default router;
