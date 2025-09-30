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

// Manual trigger for unknown emailer processing
router.post('/trigger-unknown-emailer', async (req, res) => {
    try {
        const userId = req.userId;
        const db = getDb();
        
        console.log('🧪 Manually triggering unknown emailer processing...');
        
        // Get recent emails
        const recentEmails = await db.collection('emails')
            .find({ 
                user_id: new ObjectId(String(userId)), 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
            .sort({ created_at: -1 })
            .limit(10)
            .toArray();
        
        console.log(`Found ${recentEmails.length} recent emails to process`);
        
        const results = [];
        
        for (const email of recentEmails) {
            console.log(`Processing email from: ${email.from}`);
            
            const { checkEmailFromUnknownTool } = await import('../lib/tools.js');
            const result = await checkEmailFromUnknownTool(userId, {
                emailContent: email.content,
                senderEmail: email.from,
                subject: email.subject
            });
            
            results.push({
                email: email.from,
                subject: email.subject,
                result: result
            });
            
            if (result.ok && result.isUnknownSender) {
                // Mark as processed
                await db.collection('emails').updateOne(
                    { _id: email._id },
                    { $set: { processed_for_proactive: true } }
                );
                console.log(`✅ Processed unknown sender: ${email.from}`);
            }
        }
        
        res.json({
            success: true,
            processed: results.length,
            results: results
        });
        
    } catch (error) {
        console.error('Error triggering unknown emailer processing:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger unknown emailer processing',
            message: error.message
        });
    }
});

export default router;
