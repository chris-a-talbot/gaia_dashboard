use sqlx::PgPool;
use serde::Deserialize;
use std::fs;
use std::path::Path;
use dotenvy::dotenv;
use std::env;
use std::error::Error;
use std::sync::Arc;
use indicatif::{ProgressBar, ProgressStyle};
use serde_json::Value;
use sqlx::types::Json;

#[derive(Debug, Deserialize)]
struct Population {
    id: i32,
    name: String,
    region: String,
}

#[derive(Debug, Deserialize)]
struct Individual {
    id: i32,
    flags: i32,
    location: Vec<f64>,
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

#[derive(Debug, Deserialize)]
struct Node {
    id: i32,
    flags: i32,
    time: f64,
    population: Option<i32>,
    individual: Option<i32>,
    ancestor_data_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct Edge {
    id: i32,
    parent: i32,
    child: i32,
}

#[derive(Debug, Deserialize)]
struct HexagonFeature {
    #[serde(rename = "type")]
    feature_type: String,
    properties: HexagonProperties,
    geometry: HexagonGeometry,
}

#[derive(Debug, Deserialize)]
struct HexagonProperties {
    state_id: i32,
    continent_id: String,
}

#[derive(Debug, Deserialize)]
struct HexagonGeometry {
    #[serde(rename = "type")]
    geometry_type: String,
    coordinates: Value,
}

#[derive(Debug, Deserialize)]
struct GeoJsonCollection {
    #[serde(rename = "type")]
    collection_type: String,
    features: Vec<HexagonFeature>,
}

#[derive(Debug, Deserialize)]
struct FluxData {
    time_series: Vec<Vec<FluxEntry>>
}

#[derive(Debug, Deserialize)]
struct FluxEntry {
    source_id: i32,
    target_id: i32,
    value: f64
}

#[derive(Debug, Deserialize)]
struct GeoArgEntry {
    edge_id: i32,
    state_id: i32,
    time: f64,
}

async fn read_json_file<T: for<'a> Deserialize<'a>>(file_path: &str) -> Result<Vec<T>, Box<dyn Error + Send + Sync>> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path).into());
    }

    println!("Reading file: {}", file_path);
    let content = fs::read_to_string(path)?;
    let data: Vec<T> = serde_json::from_str(&content)?;
    println!("Successfully loaded {} entries from {}", data.len(), file_path);
    Ok(data)
}

async fn get_max_id(pool: &PgPool, table: &str) -> Result<i32, sqlx::Error> {
    let query = format!("SELECT COALESCE(MAX(id), -1) FROM {}", table);
    let max_id: (i32,) = sqlx::query_as(&query)
        .fetch_one(pool)
        .await?;
    Ok(max_id.0)
}

async fn batch_insert_populations(
    pool: Arc<PgPool>,
    populations: Vec<Population>,
    last_id: i32,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let pb = ProgressBar::new(populations.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    let filtered: Vec<_> = populations.into_iter()
        .filter(|p| p.id > last_id)
        .collect();

    if filtered.is_empty() {
        println!("No new populations to insert");
        return Ok(());
    }

    for population in filtered {
        let mut tx = pool.begin().await?;

        sqlx::query!(
            r#"
            INSERT INTO populations (id, name, region)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO NOTHING
            "#,
            population.id,
            population.name,
            population.region,
        )
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        pb.inc(1);
    }

    pb.finish_with_message("Population insertion completed");
    Ok(())
}

async fn batch_insert_individuals(
    pool: Arc<PgPool>,
    individuals: Vec<Individual>,
    last_id: i32,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let pb = ProgressBar::new(individuals.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    let filtered: Vec<_> = individuals.into_iter()
        .filter(|i| i.id > last_id)
        .collect();

    if filtered.is_empty() {
        println!("No new individuals to insert");
        return Ok(());
    }

    for chunk in filtered.chunks(batch_size) {
        let mut tx = pool.begin().await?;

        for individual in chunk {
            sqlx::query!(
                r#"
                INSERT INTO individuals (
                    id, flags, location, parents, nodes,
                    array_non_reference_discordance, capmq, coverage,
                    freemix, insert_size_average, library, library_type,
                    region, sample, sample_accession, sex, source
                )
                VALUES (
                    $1, $2,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
                    $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18
                )
                ON CONFLICT (id) DO NOTHING
                "#,
                individual.id,
                individual.flags,
                individual.location[0],
                individual.location[1],
                &individual.parents,
                &individual.nodes,
                individual.array_non_reference_discordance,
                individual.capmq,
                individual.coverage,
                individual.freemix,
                individual.insert_size_average,
                individual.library,
                individual.library_type,
                individual.region,
                individual.sample,
                individual.sample_accession,
                individual.sex,
                individual.source,
            )
                .execute(&mut *tx)
                .await?;

            pb.inc(1);
        }

        tx.commit().await?;
    }

    pb.finish_with_message("Individual insertion completed");
    Ok(())
}

async fn batch_insert_nodes(
    pool: Arc<PgPool>,
    nodes: Vec<Node>,
    last_id: i32,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let pb = ProgressBar::new(nodes.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    let filtered: Vec<_> = nodes.into_iter()
        .filter(|n| n.id > last_id)
        .collect();

    if filtered.is_empty() {
        println!("No new nodes to insert");
        return Ok(());
    }

    for chunk in filtered.chunks(batch_size) {
        let mut tx = pool.begin().await?;

        for node in chunk {
            sqlx::query!(
                r#"
                INSERT INTO nodes (id, flags, time, population, individual, ancestor_data_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO NOTHING
                "#,
                node.id,
                node.flags,
                node.time,
                node.population,
                node.individual,
                node.ancestor_data_id,
            )
                .execute(&mut *tx)
                .await?;

            pb.inc(1);
        }

        tx.commit().await?;
    }

    pb.finish_with_message("Node insertion completed");
    Ok(())
}

async fn batch_insert_edges(
    pool: Arc<PgPool>,
    edges: Vec<Edge>,
    last_id: i32,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let pb = ProgressBar::new(edges.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    let filtered: Vec<_> = edges.into_iter()
        .filter(|e| e.id > last_id)
        .collect();

    if filtered.is_empty() {
        println!("No new edges to insert");
        return Ok(());
    }

    for chunk in filtered.chunks(batch_size) {
        let mut tx = pool.begin().await?;

        for edge in chunk {
            sqlx::query!(
                r#"
                INSERT INTO edges (id, parent, child)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO NOTHING
                "#,
                edge.id,
                edge.parent,
                edge.child,
            )
                .execute(&mut *tx)
                .await?;

            pb.inc(1);
        }

        tx.commit().await?;
    }

    pb.finish_with_message("Edge insertion completed");
    Ok(())
}

async fn batch_insert_hexagons(
    pool: Arc<PgPool>,
    geojson_path: &str,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    // Read the GeoJSON file
    let path = Path::new(geojson_path);
    if !path.exists() {
        return Err(format!("File not found: {}", geojson_path).into());
    }

    println!("Reading file: {}", geojson_path);
    let content = fs::read_to_string(path)?;
    let collection: GeoJsonCollection = serde_json::from_str(&content)?;

    let pb = ProgressBar::new(collection.features.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    // Process in batches
    for chunk in collection.features.chunks(batch_size) {
        let mut tx = pool.begin().await?;

        for feature in chunk {
            let geojson_str = serde_json::json!({
                "type": feature.geometry.geometry_type,
                "coordinates": feature.geometry.coordinates
            }).to_string();

            // Using regular query instead of query! macro
            sqlx::query(
                r#"
                INSERT INTO hexagons (state_id, geom, continent_id)
                VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), $3)
                ON CONFLICT (state_id) DO NOTHING
                "#
            )
                .bind(feature.properties.state_id)
                .bind(geojson_str)
                .bind(&feature.properties.continent_id)
                .execute(&mut *tx)
                .await?;

            pb.inc(1);
        }

        tx.commit().await?;
    }

    pb.finish_with_message("Hexagon insertion completed");
    Ok(())
}

async fn batch_insert_flux(
    pool: Arc<PgPool>,
    flux_path: &str,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    println!("Reading file: {}", flux_path);
    let content = fs::read_to_string(flux_path)?;
    let flux_data: FluxData = serde_json::from_str(&content)?;

    let total_entries: usize = flux_data.time_series
        .iter()
        .map(|entries| entries.len())
        .sum();

    let pb = ProgressBar::new(total_entries as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    // Process each time step
    for (time_step, entries) in flux_data.time_series.iter().enumerate() {
        let time = time_step as f64;

        for chunk in entries.chunks(batch_size) {
            let mut tx = pool.begin().await?;

            for entry in chunk {
                sqlx::query(
                    r#"
                    INSERT INTO flux (source_state_id, target_state_id, time, migration_rate)
                    VALUES ($1, $2, $3, $4)
                    "#
                )
                    .bind(entry.source_id)
                    .bind(entry.target_id)
                    .bind(time)
                    .bind(entry.value)
                    .execute(&mut *tx)
                    .await?;

                pb.inc(1);
            }

            tx.commit().await?;
        }
    }

    pb.finish_with_message("Flux insertion completed");
    Ok(())
}

async fn batch_insert_geo_arg(
    pool: Arc<PgPool>,
    geo_arg_path: &str,
    batch_size: usize,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    println!("Reading file: {}", geo_arg_path);
    let content = fs::read_to_string(geo_arg_path)?;
    let entries: Vec<GeoArgEntry> = serde_json::from_str(&content)?;

    let pb = ProgressBar::new(entries.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    // Process in batches
    for chunk in entries.chunks(batch_size) {
        let mut tx = pool.begin().await?;

        for entry in chunk {
            sqlx::query(
                r#"
                INSERT INTO geo_arg (edge_id, state_id, time)
                VALUES ($1, $2, $3)
                ON CONFLICT (edge_id, state_id, time) DO NOTHING
                "#
            )
                .bind(entry.edge_id)
                .bind(entry.state_id)
                .bind(entry.time)
                .execute(&mut *tx)
                .await?;

            pb.inc(1);
        }

        tx.commit().await?;
    }

    pb.finish_with_message("Geo arg insertion completed");
    Ok(())
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL_LOCAL").expect("DATABASE_URL must be set in .env file");

    println!("Current working directory: {:?}", env::current_dir()?);

    println!("Connecting to database...");
    let pool = PgPool::connect(&database_url).await?;
    let pool = Arc::new(pool);
    println!("Database connection established");

    // Get the last inserted IDs
    let last_population_id = get_max_id(&pool, "populations").await?;
    let last_individual_id = get_max_id(&pool, "individuals").await?;
    let last_node_id = get_max_id(&pool, "nodes").await?;
    let last_edge_id = get_max_id(&pool, "edges").await?;

    println!("Last inserted IDs:");
    println!("Populations: {}", last_population_id);
    println!("Individuals: {}", last_individual_id);
    println!("Nodes: {}", last_node_id);
    println!("Edges: {}", last_edge_id);

    // Read JSON files
    let populations = read_json_file("sql_data/populations.json").await?;
    let individuals = read_json_file("sql_data/individuals.json").await?;
    let nodes = read_json_file("sql_data/nodes.json").await?;
    let edges = read_json_file("sql_data/edges.json").await?;

    // Batch sizes optimized for different table sizes
    const INDIVIDUAL_BATCH_SIZE: usize = 100;
    const NODE_BATCH_SIZE: usize = 1000;
    const EDGE_BATCH_SIZE: usize = 5000;

    // Process tables sequentially to maintain referential integrity
    batch_insert_populations(Arc::clone(&pool), populations, last_population_id).await?;
    batch_insert_individuals(Arc::clone(&pool), individuals, last_individual_id, INDIVIDUAL_BATCH_SIZE).await?;
    batch_insert_nodes(Arc::clone(&pool), nodes, last_node_id, NODE_BATCH_SIZE).await?;
    batch_insert_edges(Arc::clone(&pool), edges, last_edge_id, EDGE_BATCH_SIZE).await?;
    batch_insert_hexagons(Arc::clone(&pool), "sql_data/landgrid_wgs84_metadata.geojson", 10).await?;
    batch_insert_flux(Arc::clone(&pool), "sql_data/flux_transformed.json", 1000).await?;
    batch_insert_geo_arg(Arc::clone(&pool), "sql_data/georef-arg.json", 5000).await?;

    println!("Data migration completed successfully!");
    Ok(())
}