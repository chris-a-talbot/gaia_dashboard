use sqlx::{Connection, PgConnection, Executor};
use dotenvy::dotenv;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load the DATABASE_URL from the .env file
    dotenv().ok();
    let database_url = env::var("DATABASE_URL")?;

    // Connect to the database
    let mut connection = PgConnection::connect(&database_url).await?;

    // SQL script to create the database schema
    let create_schema = r#"
        CREATE EXTENSION IF NOT EXISTS postgis;

        CREATE TABLE individuals (
            id SERIAL PRIMARY KEY,
            flags INTEGER NOT NULL,
            location GEOGRAPHY(POINT, 4326),
            parents INTEGER[] NOT NULL,
            nodes INTEGER[] NOT NULL,
            array_non_reference_discordance FLOAT,
            capmq INTEGER,
            coverage FLOAT,
            freemix FLOAT,
            insert_size_average FLOAT,
            library TEXT,
            library_type TEXT,
            region TEXT,
            sample TEXT,
            sample_accession TEXT,
            sex TEXT,
            source TEXT
        );

        CREATE TABLE populations (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            region TEXT NOT NULL
        );

        CREATE TABLE nodes (
            id SERIAL PRIMARY KEY,
            flags INTEGER NOT NULL,
            time FLOAT NOT NULL,
            population INTEGER REFERENCES populations(id) ON DELETE SET NULL,
            individual INTEGER REFERENCES individuals(id) ON DELETE SET NULL,
            ancestor_data_id INTEGER
        );

        CREATE TABLE edges (
            id SERIAL PRIMARY KEY,
            parent INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
            child INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE
        );

        CREATE TABLE hexagons (
            state_id INTEGER PRIMARY KEY,
            geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
            continent_id TEXT NOT NULL
        );

        CREATE TABLE flux (
            id SERIAL PRIMARY KEY,
            source_state_id INTEGER NOT NULL REFERENCES hexagons(state_id) ON DELETE CASCADE,
            target_state_id INTEGER NOT NULL REFERENCES hexagons(state_id) ON DELETE CASCADE,
            time FLOAT NOT NULL,
            migration_rate FLOAT NOT NULL
        );

        CREATE TABLE geo_arg (
            edge_id INTEGER NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
            state_id INTEGER NOT NULL REFERENCES hexagons(state_id) ON DELETE CASCADE,
            time FLOAT NOT NULL,
            PRIMARY KEY (edge_id, state_id, time)
        );
    "#;

    // Execute the schema creation script
    connection.execute(create_schema).await?;

    println!("Database schema created successfully!");

    Ok(())
}