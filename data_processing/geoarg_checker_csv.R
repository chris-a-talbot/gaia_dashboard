library(data.table)

validate_migrations <- function(georef_file, adjmat_file) {
 # Load and process data
 cat("Loading georef data...\n")
 t1 <- Sys.time()
 dt <- fread(georef_file)
 cat(sprintf("Loaded georef data in %.2f seconds. Found %d rows.\n",
             as.numeric(difftime(Sys.time(), t1, units="secs")),
             nrow(dt)))

 # Check for duplicate times with different states
 cat("\nChecking for multiple states at same time...\n")
 t1 <- Sys.time()
 dups <- dt[, if(.N > 1 && length(unique(state_id)) > 1)
            .SD, by=.(edge_id, time)]

 cat(sprintf("Found %d rows with multiple states in %.2f seconds.\n",
             nrow(dups),
             as.numeric(difftime(Sys.time(), t1, units="secs"))))

 # Process violations into output format
 invalid_edges <- list()

 if(nrow(dups) > 0) {
   cat("Processing violations...\n")
   t1 <- Sys.time()
   dup_violations <- dups[, .(
     time = time[1],
     states = list(sort(unique(state_id)))
   ), by=edge_id]

   # Store violations
   for(i in 1:nrow(dup_violations)) {
     edge <- dup_violations$edge_id[i]
     invalid_edges[[as.character(edge)]] <- list(
       violation = list(
         time = dup_violations$time[i],
         states = dup_violations$states[[i]]
       ),
       full_data = dt[edge_id == edge]  # Store full data for this edge
     )
   }
   cat(sprintf("Processed violations in %.2f seconds\n",
               as.numeric(difftime(Sys.time(), t1, units="secs"))))
 }

 return(invalid_edges)
}

# Main execution
cat("Starting validation...\n\n")
total_start_time <- Sys.time()
invalid_edges <- validate_migrations(
 "./data/georef-arg.csv",
 "./data/landgrid-adjmat.csv"
)

# Print results
cat("\nPrinting results...\n")
if(length(invalid_edges) == 0) {
 cat("No violations found!\n")
} else {
 cat(sprintf("Found %d edges with multiple states at same time:\n", length(invalid_edges)))
 for(edge_id in names(invalid_edges)) {
   cat(sprintf("\nEdge ID: %s\n", edge_id))
   v <- invalid_edges[[edge_id]]$violation
   cat(sprintf("  Time %s: States found: %s\n",
              v$time, paste(v$states, collapse=", ")))
 }

 # Print detailed information for first 3 problematic edges
 cat("\nDetailed data for first 3 problematic edges:\n")
 edge_sample <- head(names(invalid_edges), 3)
 for(edge_id in edge_sample) {
   cat(sprintf("\nFull data for Edge ID %s:\n", edge_id))
   print(invalid_edges[[edge_id]]$full_data[order(time)])  # Sort by time for clarity
 }
}

total_time <- as.numeric(difftime(Sys.time(), total_start_time, units="secs"))
cat(sprintf("\nTotal processing time: %.2f seconds\n", total_time))