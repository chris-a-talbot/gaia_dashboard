setwd("C:/Users/chtalbot/Documents/GitHub/gaia_visualizer/src/data/")

library(data.table)
library(jsonlite)

flux <- readRDS("flux-chr18p.rds")
flux_thru_time <- readRDS("flux-thru-time-chr18p.rds")

# Function to process both datasets
create_migration_data <- function(migration_array, avg_migration_matrix) {
  X <- dim(migration_array)[1]
  Z <- dim(migration_array)[3]

  # Process time series flows
  flows_by_time <- list()
  for(t in 1:Z) {
    flows <- list()
    for(i in 1:X) {
      for(j in 1:X) {
        if(i != j && migration_array[i,j,t] > 0) {
          flow <- list(
            source_id = as.character(i),
            target_id = as.character(j),
            value = migration_array[i,j,t]
          )
          flows[[length(flows) + 1]] <- flow
        }
      }
    }
    flows_by_time[[t]] <- flows
  }

  # Process average flux matrix
  avg_flows <- list()
  for(i in 1:X) {
    for(j in 1:X) {
      if(i != j && avg_migration_matrix[i,j] > 0) {
        flow <- list(
          source_id = as.character(i),
          target_id = as.character(j),
          value = avg_migration_matrix[i,j]
        )
        avg_flows[[length(avg_flows) + 1]] <- flow
      }
    }
  }

  # Combine both datasets in a single object
  return(list(
    time_series = flows_by_time,
    average_flux = avg_flows
  ))
}

# Convert and export the data
migration_data <- create_migration_data(flux_thru_time, flux)

# Export as JSON
writeLines(
  toJSON(migration_data, pretty=TRUE),
  "flux.json"
)