use axum::{
    routing::get,
    Router,
    extract::Path,
    Json,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;

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

// Sample data handler - replace with database query later
async fn get_migration_paths(Path(cell_id): Path<i32>) -> Json<Vec<MigrationPath>> {
    // For testing, return some sample data
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

#[tokio::main]
async fn main() {
    // Build our application with a single route
    let app = Router::new()
        .route("/api/migration/:cell_id", get(get_migration_paths))
        .layer(CorsLayer::permissive()); // Enable CORS for development

    println!("Server starting on http://localhost:3001");

    // Run it
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}