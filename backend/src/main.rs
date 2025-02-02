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
use sqlx::types::JsonValue;

// Shared application state
#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
}

// Data structures for each table
#[derive(Serialize, Deserialize)]
struct Individual {
    id: i32,
    flags: i32,
    location: JsonValue, // Will contain point data
    parents: Vec<i32>,
    nodes: Vec<i32>,
    array_non_reference_discordance: Option<f64>,
    capmq: Option<i32>,
    coverage: Option<f64>,
    freemix: Option<f64>,
    insert_size_average: Option<f64>,
    library: Option<String>,
    library_type: Option<String>,
    region: Option<String>,
    sample: Option<String>,
    sample_accession: Option<String>,
    sex: Option<String>,
    source: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct Population {
    id: i32,
    name: String,
    region: String,
}

#[derive(Serialize, Deserialize)]
struct Hexagon {
    state_id: i32,
    geom: JsonValue, // Will contain GeoJSON
    continent_id: String,
    center_lon: Option<f64>,
    center_lat: Option<f64>,
}

#[derive(Serialize, Deserialize)]
struct GeoArgPath {
    edge_id: i32,
    entries: Vec<GeoArg>,
}

#[derive(Serialize, Deserialize)]
struct Flux {
    id: i32,
    source_state_id: i32,
    target_state_id: i32,
    time: f64,
    migration_rate: f64,
}

#[derive(Serialize, Deserialize)]
struct GeoArg {
    edge_id: i32,
    state_id: i32,
    time: f64,
}

#[derive(Serialize, Deserialize)]
struct AverageFlux {
    source_state_id: i32,
    target_state_id: i32,
    average_migration_rate: f64,
}

// Handler functions for each endpoint
async fn get_all_individuals(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Individual>> {
    let individuals = sqlx::query_as!(
        Individual,
        r#"
        SELECT
            id,
            flags,
            ST_AsGeoJSON(location)::jsonb as "location!: JsonValue",
            parents,
            nodes,
            array_non_reference_discordance,
            capmq,
            coverage,
            freemix,
            insert_size_average,
            library,
            library_type,
            region,
            sample,
            sample_accession,
            sex,
            source
        FROM individuals
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(individuals)
}

async fn get_all_hexagons(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Hexagon>> {
    let hexagons = sqlx::query_as!(
        Hexagon,
        r#"
        SELECT
            state_id,
            ST_AsGeoJSON(geom)::jsonb as "geom!: JsonValue",
            continent_id,
            center_lon,
            center_lat
        FROM hexagons
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(hexagons)
}

async fn get_all_populations(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Population>> {
    let populations = sqlx::query_as!(
        Population,
        r#"
        SELECT id, name, region
        FROM populations
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(populations)
}

async fn get_all_flux(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Flux>> {
    let flux = sqlx::query_as!(
        Flux,
        r#"
        SELECT id, source_state_id, target_state_id, time, migration_rate
        FROM flux
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(flux)
}

async fn get_all_geo_arg(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<GeoArg>> {
    let geo_args = sqlx::query_as!(
        GeoArg,
        r#"
        SELECT edge_id, state_id, time
        FROM geo_arg
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(geo_args)
}

// Health check endpoint
async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}
// First, add these indexes to your database schema:
/*
CREATE INDEX IF NOT EXISTS idx_edges_child ON edges(child);
CREATE INDEX IF NOT EXISTS idx_edges_parent ON edges(parent);
CREATE INDEX IF NOT EXISTS idx_geo_arg_edge_id ON geo_arg(edge_id);
CREATE INDEX IF NOT EXISTS idx_individuals_nodes ON individuals USING GIN(nodes);
*/

async fn get_origin_paths(
    Path(state_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> Json<Vec<GeoArgPath>> {
    // First, get a limited set of edges that involve our state_id
    let paths = sqlx::query_as!(
        GeoArg,
        r#"
        WITH relevant_transitions AS (
            -- Find edges where our state appears, ordered by time
            SELECT DISTINCT edge_id
            FROM geo_arg
            WHERE state_id = $1
            LIMIT 1000  -- Add a reasonable limit to prevent timeout
        )
        -- Get all geo_arg entries for these edges
        SELECT
            g.edge_id,
            g.state_id,
            g.time
        FROM geo_arg g
        INNER JOIN relevant_transitions rt ON g.edge_id = rt.edge_id
        ORDER BY g.edge_id, g.time
        "#,
        state_id
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let mut grouped_paths: Vec<GeoArgPath> = Vec::new();
    let mut current_edge_id: Option<i32> = None;
    let mut current_entries: Vec<GeoArg> = Vec::new();

    for entry in paths {
        if let Some(edge_id) = current_edge_id {
            if edge_id != entry.edge_id {
                grouped_paths.push(GeoArgPath {
                    edge_id,
                    entries: std::mem::take(&mut current_entries),
                });
                current_edge_id = Some(entry.edge_id);
            }
        } else {
            current_edge_id = Some(entry.edge_id);
        }
        current_entries.push(entry);
    }

    if let Some(edge_id) = current_edge_id {
        grouped_paths.push(GeoArgPath {
            edge_id,
            entries: current_entries,
        });
    }

    Json(grouped_paths)
}

async fn get_average_flux(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<AverageFlux>> {
    let average_flux = sqlx::query_as!(
        AverageFlux,
        r#"
        SELECT
            source_state_id,
            target_state_id,
            AVG(migration_rate) as "average_migration_rate!: f64"
        FROM flux
        GROUP BY source_state_id, target_state_id
        HAVING AVG(migration_rate) > 0
        ORDER BY source_state_id, target_state_id
        "#
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Json(average_flux)
}

// Add this new handler function to your existing code
async fn get_individual_origin_paths(
    Path(individual_id): Path<i32>,
    State(state): State<Arc<AppState>>,
) -> Json<Vec<GeoArgPath>> {
    // First, recursively get all edges leading to the individual's nodes
    let edges = sqlx::query!(
        r#"
        WITH RECURSIVE node_tree AS (
            -- Base case: get the individual's direct nodes
            SELECT n.id AS node_id
            FROM nodes n
            WHERE n.id = ANY(
                SELECT UNNEST(nodes)
                FROM individuals
                WHERE id = $1
            )

            UNION

            -- Recursive case: get parent nodes
            SELECT e.parent AS node_id
            FROM edges e
            INNER JOIN node_tree nt ON e.child = nt.node_id
        )
        SELECT DISTINCT e.id as edge_id
        FROM edges e
        WHERE e.child IN (SELECT node_id FROM node_tree)
        OR e.parent IN (SELECT node_id FROM node_tree)
        "#,
        individual_id
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let edge_ids: Vec<i32> = edges.iter().map(|e| e.edge_id).collect();

    // If no edges found, return empty result
    if edge_ids.is_empty() {
        return Json(Vec::new());
    }

    // Get all geo_arg entries for these edges
    let paths = sqlx::query_as!(
        GeoArg,
        r#"
        SELECT
            edge_id,
            state_id,
            time
        FROM geo_arg
        WHERE edge_id = ANY($1)
        ORDER BY edge_id, time
        "#,
        &edge_ids
    )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    // Group the paths by edge_id
    let mut grouped_paths: Vec<GeoArgPath> = Vec::new();
    let mut current_edge_id: Option<i32> = None;
    let mut current_entries: Vec<GeoArg> = Vec::new();

    for entry in paths {
        if let Some(edge_id) = current_edge_id {
            if edge_id != entry.edge_id {
                grouped_paths.push(GeoArgPath {
                    edge_id,
                    entries: std::mem::take(&mut current_entries),
                });
                current_edge_id = Some(entry.edge_id);
            }
        } else {
            current_edge_id = Some(entry.edge_id);
        }
        current_entries.push(entry);
    }

    // Don't forget the last group
    if let Some(edge_id) = current_edge_id {
        grouped_paths.push(GeoArgPath {
            edge_id,
            entries: current_entries,
        });
    }

    Json(grouped_paths)
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
        .route("/api/individuals", get(get_all_individuals))
        .route("/api/hexagons", get(get_all_hexagons))
        .route("/api/populations", get(get_all_populations))
        .route("/api/flux", get(get_all_flux))
        .route("/api/average-flux", get(get_average_flux))  // New route
        .route("/api/geo-arg", get(get_all_geo_arg))
        .route("/api/origin-paths/:state_id", get(get_origin_paths))
        .route("/health", get(health_check))
        .route("/api/individual-origin-paths/:individual_id", get(get_individual_origin_paths))
        .layer(CorsLayer::permissive())
        .with_state(state);

    println!("Server starting on http://localhost:3001");

    // Run the server
    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}