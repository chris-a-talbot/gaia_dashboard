use sqlx::PgPool;
use serde::Deserialize;
use std::fs;
use std::path::Path;
use dotenvy::dotenv;
use std::env;
use std::error::Error;
use indicatif::{ProgressBar, ProgressStyle};

#[derive(Debug, Deserialize)]
struct Individual {
    id: i32,
    location: Vec<f64>,
}

async fn read_json_file<T: for<'a> Deserialize<'a>>(file_path: &str) -> Result<Vec<T>, Box<dyn Error>> {
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set in .env file");

    println!("Connecting to database...");
    let pool = PgPool::connect(&database_url).await?;
    println!("Database connection established");

    // Read individuals data
    let individuals: Vec<Individual> = read_json_file("./sql_data/individuals.json").await?;

    let pb = ProgressBar::new(individuals.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("[{elapsed_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
        .unwrap());

    // Count successful and failed updates
    let mut success_count = 0;
    let mut fail_count = 0;

    // Update each individual's location
    for individual in individuals {
        let lat = individual.location[0]; // First value is latitude
        let lon = individual.location[1]; // Second value is longitude

        let result = sqlx::query!(
            r#"
            UPDATE individuals
            SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
            WHERE id = $1
            "#,
            individual.id,
            lon,  // ST_MakePoint takes (longitude, latitude)
            lat   // Swap the order for PostGIS
        )
            .execute(&pool)
            .await;

        match result {
            Ok(res) => {
                if res.rows_affected() > 0 {
                    success_count += 1;
                } else {
                    fail_count += 1;
                    println!("No record found for ID: {}", individual.id);
                }
            }
            Err(e) => {
                fail_count += 1;
                println!("Error updating ID {}: {}", individual.id, e);
            }
        }

        pb.inc(1);
    }

    pb.finish_with_message(format!(
        "Location updates completed - Successful: {}, Failed: {}",
        success_count,
        fail_count
    ));

    Ok(())
}