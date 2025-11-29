/**
 * n8n-clone - Main Application Entry Point (Bogus/Mock Implementation)
 *
 * This file sets up the core services, initializes the Express server,
 * and starts the workflow execution engine.
 */

// --- Imports ---
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // For request logging
const { WorkflowEngine } = require('./engine/WorkflowEngine');
const { ApiRouter } = require('./api/ApiRouter');
const { DatabaseService } = require('./services/DatabaseService');
const { NodeRegistry } = require('./registry/NodeRegistry');
const { config } = require('./config');

// --- Initialization ---
const app = express();
const PORT = config.server.port || 5678;

// Initialize Core Services
const databaseService = new DatabaseService(config.database);
const nodeRegistry = new NodeRegistry();

// Mock registry population
console.log('Registering default nodes...');
nodeRegistry.registerDefaultNodes();
console.log(`Registered ${nodeRegistry.count()} nodes successfully.`);

// Initialize the Workflow Execution Engine
const workflowEngine = new WorkflowEngine({ databaseService, nodeRegistry });


// --- Middleware Setup ---

// 1. Logging Middleware
app.use(morgan('combined'));

// 2. JSON Body Parsing
app.use(bodyParser.json());

// 3. Security Headers (Mocked for production readiness)
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'n8n-clone-bogus');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Should be restricted in reality
    next();
});

// --- Routing ---

// Core API Router (handles GET /workflows, POST /executions, etc.)
const apiRouter = new ApiRouter(workflowEngine);
app.use('/api/v1', apiRouter.getRouter());

// Public Webhook Listener (handles incoming webhook triggers)
app.post('/webhook/:workflowId', (req, res) => {
    const { workflowId } = req.params;
    console.log(`[TRIGGER] Incoming webhook for workflow ID: ${workflowId}`);

    // Mock immediate execution response
    workflowEngine.triggerWorkflow(workflowId, 'webhook', req.body)
        .then(result => {
            console.log(`Workflow ${workflowId} execution status: ${result.status}`);
            res.status(200).send({ message: 'Workflow triggered', executionId: result.executionId });
        })
        .catch(error => {
            console.error(`Error triggering workflow ${workflowId}:`, error.message);
            res.status(500).send({ message: 'Internal Server Error' });
        });
});

// Serve the UI (assuming the built front-end is in a 'dist' folder)
app.use(express.static('dist'));

// Catch-all for SPA routing (sends the index.html for any route not matched by /api or /webhook)
app.get('*', (req, res) => {
    res.sendFile('index.html', { root: 'dist' });
});


// --- Server Startup ---

async function startApplication() {
    try {
        // 1. Connect to the database
        await databaseService.connect();
        console.log('Database connection successful.');

        // 2. Start the background worker (for scheduled and queued jobs)
        workflowEngine.startWorker();
        console.log('Workflow execution worker started.');

        // 3. Start the HTTP server
        app.listen(PORT, () => {
            console.log('-------------------------------------------');
            console.log(`🚀 n8n-clone Server running at http://localhost:${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api/v1`);
            console.log('-------------------------------------------');
        });

    } catch (error) {
        console.error('FATAL ERROR: Failed to start n8n-clone.', error);
        process.exit(1);
    }
}

// Execute the startup sequence
startApplication();

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    workflowEngine.stopWorker();
    databaseService.disconnect();
    // In a real app, you'd close the express server here
    process.exit(0);
});
