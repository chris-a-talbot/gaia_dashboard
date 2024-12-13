library(data.table)
library(jsonlite)

# Read the CSV file
georef_dt <- fread("./src/data/georef-arg.csv")

# Select only the columns we want for the full dataset
georef_filtered <- georef_dt[, .(edge_id, state_id, time)]

# Write full dataset to JSON
write_json(georef_filtered, 
           "./src/data/georef-arg.json",
           auto_unbox = TRUE)

# Create minimized version
# Get unique edge_ids
unique_edges <- unique(georef_filtered$edge_id)

# Sample 50 random edge_ids
set.seed(42) # For reproducibility
sampled_edges <- sample(unique_edges, 50)

# Filter the data to only include rows with the sampled edge_ids
georef_min <- georef_filtered[edge_id %in% sampled_edges]

# Write minimized version to JSON
write_json(georef_min, 
           "./src/data/georef-arg-min.json",
           auto_unbox = TRUE)

# Print summary statistics
cat("\nFull dataset summary:\n")
cat("Total rows:", nrow(georef_filtered), "\n")
cat("Total unique edge_ids:", length(unique_edges), "\n")

cat("\nMinimized dataset summary:\n")
cat("Total rows:", nrow(georef_min), "\n")
cat("Total unique edge_ids:", length(unique(georef_min$edge_id)), "\n")
