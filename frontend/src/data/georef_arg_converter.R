library(data.table)
library(jsonlite)

# Set working directory to your project root (adjust as needed)
setwd("/home/christ/Documents/GitHub/gaia_visualizer")

# Read the CSV file
georef_dt <- fread("./src/data/georef-arg.csv")

# Select only the columns we want
georef_filtered <- georef_dt[, .(edge_id, state_id, time)]

# Write to JSON
write_json(georef_filtered, 
           "./src/data/georef-arg.json",
           auto_unbox = TRUE)

# Optional: Print first few rows to verify structure
print(head(georef_filtered))
