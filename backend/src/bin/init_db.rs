use sqlx::postgres::PgPoolOptions;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    tracing::info!("Connecting to database...");

    // Create connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    tracing::info!("Connected successfully. Creating tables...");

    // Create tables using standard PostgreSQL types instead of PostGIS
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS hexagon_cells (
            state_id INTEGER PRIMARY KEY,
            continent_id VARCHAR(10),
            center_longitude DOUBLE PRECISION,
            center_latitude DOUBLE PRECISION,
            boundary_points JSONB
        )"
    )
        .execute(&pool)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS points (
            node_id INTEGER PRIMARY KEY,
            longitude DOUBLE PRECISION,
            latitude DOUBLE PRECISION
        )"
    )
        .execute(&pool)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS flux_entries (
            id SERIAL PRIMARY KEY,
            source_id INTEGER REFERENCES hexagon_cells(state_id),
            target_id INTEGER REFERENCES hexagon_cells(state_id),
            time_index INTEGER,
            value DOUBLE PRECISION,
            CONSTRAINT unique_flux UNIQUE (source_id, target_id, time_index)
        )"
    )
        .execute(&pool)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS georef_entries (
            id SERIAL PRIMARY KEY,
            edge_id INTEGER,
            state_id INTEGER REFERENCES hexagon_cells(state_id),
            time DOUBLE PRECISION,
            CONSTRAINT unique_georef UNIQUE (edge_id, state_id, time)
        )"
    )
        .execute(&pool)
        .await?;

    tracing::info!("Created tables successfully. Creating indexes...");

    // Create indexes
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_hexagon_location ON hexagon_cells(center_longitude, center_latitude)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_flux_time ON flux_entries(time_index)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_georef_edge ON georef_entries(edge_id)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_georef_state ON georef_entries(state_id)")
        .execute(&pool)
        .await?;

    tracing::info!("Database initialization completed successfully!");

    Ok(())
}