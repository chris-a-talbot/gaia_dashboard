library(jsonlite)

# Read the JSON file
data <- fromJSON("./src/data/flux.json", simplifyVector = FALSE)

# Function to transform an individual entry
transform_entry <- function(entry) {
  entry$source_id <- as.numeric(entry$source_id[[1]])
  entry$target_id <- as.numeric(entry$target_id[[1]])
  entry$value <- entry$value[[1]]
  return(entry)
}

# Transform time series data - handle the nested structure
data$time_series <- lapply(data$time_series, function(time_slice) {
  lapply(time_slice, transform_entry)
})

# Transform average flux data
data$average_flux <- lapply(data$average_flux, transform_entry)

# Write the transformed data back to a JSON file
writeLines(toJSON(data, pretty = TRUE, auto_unbox = TRUE), "./src/data/flux_transformed.json")