use axum::{
    routing::get,
    Router,
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use std::sync::Arc;

// Shared application state
#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
}

// Match your existing TypeScript types
#[derive(Serialize, Deserialize)]
struct MigrationStep {
    source_id: i32,
    target_id: i32,
    time: f64,
}

#[derive(Serialize, Deserialize)]
struct MigrationPath {
    edge_id: i32,
    steps: Vec<MigrationStep>,
}

// Modified to use database connection
async fn get_migration_paths(
    Path(cell_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> Json<Vec<MigrationPath>> {
    // For now, keeping your sample data
    // TODO: Replace with actual database query
    let sample_path = MigrationPath {
        edge_id: 1,
        steps: vec![
            MigrationStep {
                source_id: cell_id,
                target_id: cell_id + 1,
                time: 0.5,
            },
            MigrationStep {
                source_id: cell_id + 1,
                target_id: cell_id + 2,
                time: 0.7,
            },
        ],
    };

    Json(vec![sample_path])
}

// Health check endpoint
async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    // Create connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create connection pool");

    // Create shared state
    let state = Arc::new(AppState { pool });

    // Build our application with routes
    let app = Router::new()
        .route("/api/migration/:cell_id", get(get_migration_paths))
        .route("/health", get(health_check))
        .layer(CorsLayer::permissive())
        .with_state(state);

    println!("Server starting on http://localhost:3001");

    // Run it with your existing configuration
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}