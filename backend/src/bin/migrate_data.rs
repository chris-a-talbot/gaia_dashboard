use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use std::error::Error;
use std::fs::File;
use std::io::BufReader;
use std::collections::HashSet;

#[derive(Debug, Serialize, Deserialize)]
struct Point {
    node_id: i32,
    latitude: f64,
    longitude: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct Centerpoint {
    latitude: f64,
    longitude: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct HexagonProperties {
    state_id: i32,
    continent_id: String,
    centerpoint: Centerpoint,
}

#[derive(Debug, Serialize, Deserialize)]
struct HexagonFeature {
    properties: HexagonProperties,
    geometry: geojson::Geometry,
}

#[derive(Debug, Serialize, Deserialize)]
struct HexagonCollection {
    features: Vec<HexagonFeature>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FluxEntry {
    source_id: i32,
    target_id: i32,
    value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct FluxData {
    time_series: Vec<Vec<FluxEntry>>,
    average_flux: Vec<FluxEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeorefEntry {
    edge_id: i32,
    state_id: i32,
    time: f64,
}

// Helper function to handle float comparison
fn float_eq(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-10
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");

    tracing::info!("Connecting to database...");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Check existing hexagon cells
    tracing::info!("Checking existing hexagon cells...");
    let existing_hexagons = sqlx::query!("SELECT state_id FROM hexagon_cells")
        .fetch_all(&pool)
        .await?;

    let existing_hexagon_ids: HashSet<i32> = existing_hexagons
        .iter()
        .map(|row| row.state_id)
        .collect();

    // Migrate hexagon data
    tracing::info!("Migrating hexagon grid data...");
    let hexagon_file = File::open("../frontend/src/data/landgrid_wgs84_metadata.geojson")?;
    let hexagon_reader = BufReader::new(hexagon_file);
    let hexagon_data: HexagonCollection = serde_json::from_reader(hexagon_reader)?;

    for feature in hexagon_data.features {
        if !existing_hexagon_ids.contains(&feature.properties.state_id) {
            sqlx::query!(
                r#"
                INSERT INTO hexagon_cells
                    (state_id, continent_id, center_longitude, center_latitude, boundary_points)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (state_id) DO UPDATE SET
                    continent_id = EXCLUDED.continent_id,
                    center_longitude = EXCLUDED.center_longitude,
                    center_latitude = EXCLUDED.center_latitude,
                    boundary_points = EXCLUDED.boundary_points
                "#,
                feature.properties.state_id,
                feature.properties.continent_id,
                feature.properties.centerpoint.longitude,
                feature.properties.centerpoint.latitude,
                serde_json::to_value(feature.geometry)?
            )
                .execute(&pool)
                .await?;
        }
    }

    // Check existing points
    tracing::info!("Checking existing points...");
    let existing_points = sqlx::query!("SELECT node_id FROM points")
        .fetch_all(&pool)
        .await?;

    let existing_point_ids: HashSet<i32> = existing_points
        .iter()
        .map(|row| row.node_id)
        .collect();

    // Migrate point data
    tracing::info!("Migrating point data...");
    let point_file = File::open("../frontend/src/data/coords_wgs84.json")?;
    let point_reader = BufReader::new(point_file);
    let point_data: Vec<Point> = serde_json::from_reader(point_reader)?;

    let new_points: Vec<&Point> = point_data
        .iter()
        .filter(|p| !existing_point_ids.contains(&p.node_id))
        .collect();

    for chunk in new_points.chunks(1000) {
        if !chunk.is_empty() {
            let mut query = String::from(
                "INSERT INTO points (node_id, longitude, latitude) VALUES "
            );
            let values: Vec<String> = chunk
                .iter()
                .map(|p| format!("({}, {}, {})", p.node_id, p.longitude, p.latitude))
                .collect();
            query.push_str(&values.join(","));
            query.push_str(" ON CONFLICT (node_id) DO UPDATE SET
                longitude = EXCLUDED.longitude,
                latitude = EXCLUDED.latitude");

            sqlx::query(&query)
                .execute(&pool)
                .await?;
        }
    }

    // Check existing flux entries
    // Check existing flux entries
    tracing::info!("Checking existing flux entries...");
    let existing_flux = sqlx::query!(
        "SELECT DISTINCT source_id, target_id, time_index FROM flux_entries
         WHERE source_id IS NOT NULL AND target_id IS NOT NULL"
    )
        .fetch_all(&pool)
        .await?;

    let existing_flux_keys: HashSet<(i32, i32, Option<i32>)> = existing_flux
        .iter()
        .filter_map(|row| {
            match (row.source_id, row.target_id) {
                (Some(s), Some(t)) => Some((s, t, row.time_index)),
                _ => None
            }
        })
        .collect();

    // Migrate flux data
    tracing::info!("Migrating flux data...");
    let flux_file = File::open("../frontend/src/data/flux_transformed.json")?;
    let flux_reader = BufReader::new(flux_file);
    let flux_data: FluxData = serde_json::from_reader(flux_reader)?;

    // Migrate average flux
    for chunk in flux_data.average_flux.chunks(1000) {
        let new_entries: Vec<&FluxEntry> = chunk
            .iter()
            .filter(|f| !existing_flux_keys.contains(&(f.source_id, f.target_id, None)))
            .collect();

        if !new_entries.is_empty() {
            let mut query = String::from(
                "INSERT INTO flux_entries (source_id, target_id, time_index, value) VALUES "
            );
            let values: Vec<String> = new_entries
                .iter()
                .map(|f| format!("({}, {}, NULL, {})", f.source_id, f.target_id, f.value))
                .collect();
            query.push_str(&values.join(","));
            query.push_str(" ON CONFLICT (source_id, target_id, time_index) DO UPDATE SET
                value = EXCLUDED.value");

            sqlx::query(&query)
                .execute(&pool)
                .await?;
        }
    }

    // Migrate time series flux
    for (time_idx, entries) in flux_data.time_series.iter().enumerate() {
        for chunk in entries.chunks(1000) {
            let new_entries: Vec<&FluxEntry> = chunk
                .iter()
                .filter(|f| !existing_flux_keys.contains(&(f.source_id, f.target_id, Some(time_idx as i32))))
                .collect();

            if !new_entries.is_empty() {
                let mut query = String::from(
                    "INSERT INTO flux_entries (source_id, target_id, time_index, value) VALUES "
                );
                let values: Vec<String> = new_entries
                    .iter()
                    .map(|f| format!("({}, {}, {}, {})",
                                     f.source_id, f.target_id, time_idx as i32, f.value))
                    .collect();
                query.push_str(&values.join(","));
                query.push_str(" ON CONFLICT (source_id, target_id, time_index) DO UPDATE SET
                    value = EXCLUDED.value");

                sqlx::query(&query)
                    .execute(&pool)
                    .await?;
            }
        }
    }

    // Check existing georef entries
    tracing::info!("Checking existing georef entries...");
    let existing_georef = sqlx::query!(
        "SELECT DISTINCT edge_id, state_id, time FROM georef_entries
         WHERE edge_id IS NOT NULL AND state_id IS NOT NULL AND time IS NOT NULL"
    )
        .fetch_all(&pool)
        .await?;

    // Store existing entries in a Vec for manual comparison
    let existing_georef_entries: Vec<(i32, i32, f64)> = existing_georef
        .iter()
        .filter_map(|row| {
            match (row.edge_id, row.state_id, row.time) {
                (Some(e), Some(s), Some(t)) => Some((e, s, t)),
                _ => None
            }
        })
        .collect();

    // Migrate georef data
    tracing::info!("Migrating georef data...");
    let georef_file = File::open("../frontend/src/data/georef-arg.json")?;
    let georef_reader = BufReader::new(georef_file);
    let georef_data: Vec<GeorefEntry> = serde_json::from_reader(georef_reader)?;

    let total_georef = georef_data.len();
    let mut processed_georef = 0;

    for chunk in georef_data.chunks(100) {
        let new_entries: Vec<&GeorefEntry> = chunk
            .iter()
            .filter(|g| !existing_georef_entries
                .iter()
                .any(|(e, s, t)|
                    *e == g.edge_id &&
                        *s == g.state_id &&
                        float_eq(*t, g.time)
                ))
            .collect();

        if !new_entries.is_empty() {
            let mut query = String::from(
                "INSERT INTO georef_entries (edge_id, state_id, time) VALUES "
            );

            let values: Vec<String> = new_entries
                .iter()
                .map(|g| format!("({}, {}, {})", g.edge_id, g.state_id, g.time))
                .collect();

            query.push_str(&values.join(","));
            query.push_str(" ON CONFLICT DO NOTHING");

            sqlx::query(&query)
                .execute(&pool)
                .await?;
        }

        processed_georef += chunk.len();
        if processed_georef % 1000 == 0 {
            tracing::info!("Processed {}/{} georef entries", processed_georef, total_georef);
        }
    }

    tracing::info!("Data migration completed successfully!");
    Ok(())
}