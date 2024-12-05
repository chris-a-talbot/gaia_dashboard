library(sf)

setwd("/home/christ/Documents/GitHub/gaia_visualizer")

landgrid = st_read("./src/data/landgrid.gpkg")

st_crs(landgrid)

# Assuming your data is in 'test'
landgrid_wgs84 <- st_transform(landgrid, "EPSG:4326")

# Write to GeoJSON
st_write(landgrid_wgs84, "./src/data/landgrid_wgs84.geojson", driver = "GeoJSON")
