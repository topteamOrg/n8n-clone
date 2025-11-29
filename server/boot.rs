// n8n-clone - High-Performance Rust Server Entry Point (Bogus/Mock Implementation)
// This file uses Actix Web to handle HTTP requests and orchestrate the
// workflow engine and API routing.

use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use std::sync::{Arc, Mutex};
use std::env;

// --- Mock Service Definitions (These structs would hold the actual logic) ---

/// Mock configuration struct
struct Config {
    port: u16,
    database_url: String,
}

impl Config {
    /// Loads configuration from environment variables or uses defaults
    fn load() -> Self {
        Config {
            port: env::var("PORT").unwrap_or_else(|_| "5678".to_string()).parse().unwrap_or(5678),
            database_url: env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://user@host/n8n".to_string()),
        }
    }
}

/// Mock structure for the Node Registry
struct NodeRegistry;
impl NodeRegistry {
    fn new() -> Self {
        println!("  [Init] NodeRegistry created.");
        NodeRegistry {}
    }
    fn register_default_nodes(&self) {
        println!("  [Init] Registered 42 default nodes.");
    }
}

/// Mock structure for the Database Service
struct DatabaseService;
impl DatabaseService {
    fn new(url: &str) -> Self {
        println!("  [Init] DatabaseService configured for: {}", url);
        DatabaseService {}
    }
    async fn connect(&self) -> Result<(), String> {
        // Mock async connection delay
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        println!("  [Init] Database connection successful.");
        Ok(())
    }
}

/// Mock structure for the Workflow Engine
struct WorkflowEngine {
    // In a real application, this would contain logic for scheduling and executing workflows.
    is_running: Mutex<bool>,
}

impl WorkflowEngine {
    fn new() -> Self {
        println!("  [Init] WorkflowEngine created.");
        WorkflowEngine { is_running: Mutex::new(false) }
    }
    fn start_worker(&self) {
        let mut running = self.is_running.lock().unwrap();
        *running = true;
        println!("  [Init] Workflow execution worker started.");
    }
    /// Mock function to trigger a workflow
    async fn trigger_workflow(&self, id: &str, body: web::Bytes) -> Result<String, String> {
        println!("  [Engine] Executing workflow {} with payload length {}", id, body.len());
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        Ok(format!("exec-{}", uuid::Uuid::new_v4()))
    }
}


// --- Handlers (Actix Web request processing functions) ---

/// Handler for the core API status check (GET /api/v1/status)
async fn status_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "n8n-clone-rust-backend",
        "version": "0.1.0-bogus"
    }))
}

/// Handler for the public webhook listener (POST /webhook/{workflowId})
async fn webhook_trigger(
    path: web::Path<String>, // Extracts the workflow ID from the URL path
    body: web::Bytes,        // Extracts the raw request body
    engine_data: web::Data<Arc<WorkflowEngine>>, // Shared application state
) -> impl Responder {
    let workflow_id = path.into_inner();
    println!("  [TRIGGER] Incoming webhook for workflow ID: {}", workflow_id);

    match engine_data.trigger_workflow(&workflow_id, body).await {
        Ok(execution_id) => {
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Workflow triggered successfully",
                "executionId": execution_id
            }))
        },
        Err(e) => {
            HttpResponse::InternalServerError().json(serde_json::json!({
                "message": "Error triggering workflow",
                "error": e
            }))
        }
    }
}


// --- Main Application Startup ---

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Enable logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    // 1. Load Configuration
    let cfg = Config::load();
    println!("\n[SETUP] Starting n8n-clone Rust Server on port {}...", cfg.port);

    // 2. Initialize Services (Wrapped in Arc for thread-safe sharing)
    let db_service = DatabaseService::new(&cfg.database_url);
    let node_registry = NodeRegistry::new();
    node_registry.register_default_nodes();
    let workflow_engine = Arc::new(WorkflowEngine::new());

    // 3. Connect to Database (Async operation)
    match db_service.connect().await {
        Ok(_) => {},
        Err(e) => {
            eprintln!("FATAL: Could not connect to database. {}", e);
            std::process::exit(1);
        }
    }

    // 4. Start Engine Worker
    workflow_engine.start_worker();

    // 5. Start HTTP Server
    println!("\n[SERVER] Launching Actix Web Server...");
    HttpServer::new(move || {
        App::new()
            // State: Share the engine globally across all handlers
            .app_data(web::Data::new(Arc::clone(&workflow_engine)))

            // Middleware for logging and security headers (Actix handles CORS/logging differently)
            .wrap(actix_web::middleware::Logger::default())

            // --- Define API Routes ---
            .service(
                web::scope("/api/v1")
                    .route("/status", web::get().to(status_check))
                    // Mock endpoint for listing workflows
                    .route("/workflows", web::get().to(|| HttpResponse::Ok().body("Workflow list...")))
            )

            // --- Define Webhook Listener ---
            // Actix allows path variables like {workflowId}
            .service(
                web::scope("/webhook")
                    .route("/{workflowId}", web::post().to(webhook_trigger))
            )

            // --- Mock Serving the UI (Requires a static files service) ---
            // In a real setup, we would serve static files from a 'dist' directory.
            // .service(actix_files::Files::new("/", "./dist").index_file("index.html"))

    })
    .bind(("127.0.0.1", cfg.port))? // Bind to the configured port
    .run()
    .await // Actix will run until the process is terminated
}

// NOTE: This bogus implementation assumes the 'actix-web', 'tokio', 'serde_json',
// 'serde', 'env_logger', and 'uuid' crates are available in the Cargo.toml.
