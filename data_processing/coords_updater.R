library(sf)
library(data.table)

setwd("/home/christ/Documents/GitHub/gaia_visualizer")

coords = fread("./src/data/trees/sample-coords.csv")

# Create custom CRS string for the Equal Earth projection with custom parameters
ee_crs <- 'PROJCRS["Sphere_Equal_Earth_Greenwich",
    BASEGEOGCRS["GCS_Sphere_GRS_1980_Mean_Radius",
        DATUM["D_Sphere_GRS_1980_Mean_Radius",
            ELLIPSOID["Sphere_GRS_1980_Mean_Radius",6371008.7714,0,
                LENGTHUNIT["metre",1,
                    ID["EPSG",9001]]]],
        PRIMEM["Khovsgol",100,
            ANGLEUNIT["Degree",0.0174532925199433]]],
    CONVERSION["unnamed",
        METHOD["Equal Earth",
            ID["EPSG",1078]],
        PARAMETER["Longitude of natural origin",0,
            ANGLEUNIT["Degree",0.0174532925199433],
            ID["EPSG",8802]],
        PARAMETER["False easting",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8806]],
        PARAMETER["False northing",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8807]]],
    CS[Cartesian,2],
        AXIS["(E)",east,
            ORDER[1],
            LENGTHUNIT["metre",1,
                ID["EPSG",9001]]],
        AXIS["(N)",north,
            ORDER[2],
            LENGTHUNIT["metre",1,
                ID["EPSG",9001]]]]'

# Convert data.table to sf object
coords_sf <- st_as_sf(coords, coords = c("X", "Y"), crs = ee_crs)

# Transform to WGS84
coords_wgs84_sf <- st_transform(coords_sf, 4326)

# Extract coordinates back to data.table
coords_wgs84_dt <- data.table(
  node_id = coords_dt$node_id,
  lon = st_coordinates(coords_wgs84_sf)[,1],
  lat = st_coordinates(coords_wgs84_sf)[,2]
)

library(sf)
library(data.table)

setwd("/home/christ/Documents/GitHub/gaia_visualizer")

coords = fread("./src/data/trees/sample-coords.csv")

# Create custom CRS string for the Equal Earth projection with custom parameters
ee_crs <- 'PROJCRS["Sphere_Equal_Earth_Greenwich",
    BASEGEOGCRS["GCS_Sphere_GRS_1980_Mean_Radius",
        DATUM["D_Sphere_GRS_1980_Mean_Radius",
            ELLIPSOID["Sphere_GRS_1980_Mean_Radius",6371008.7714,0,
                LENGTHUNIT["metre",1,
                    ID["EPSG",9001]]]],
        PRIMEM["Khovsgol",100,
            ANGLEUNIT["Degree",0.0174532925199433]]],
    CONVERSION["unnamed",
        METHOD["Equal Earth",
            ID["EPSG",1078]],
        PARAMETER["Longitude of natural origin",0,
            ANGLEUNIT["Degree",0.0174532925199433],
            ID["EPSG",8802]],
        PARAMETER["False easting",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8806]],
        PARAMETER["False northing",0,
            LENGTHUNIT["metre",1],
            ID["EPSG",8807]]],
    CS[Cartesian,2],
        AXIS["(E)",east,
            ORDER[1],
            LENGTHUNIT["metre",1,
                ID["EPSG",9001]]],
        AXIS["(N)",north,
            ORDER[2],
            LENGTHUNIT["metre",1,
                ID["EPSG",9001]]]]'

# Convert data.table to sf object
coords_sf <- st_as_sf(coords, coords = c("X", "Y"), crs = ee_crs)

# Transform to WGS84
coords_wgs84_sf <- st_transform(coords_sf, 4326)

# Extract coordinates back to data.table
coords_wgs84_dt <- data.table(
  node_id = coords_dt$node_id,
  lon = st_coordinates(coords_wgs84_sf)[,1],
  lat = st_coordinates(coords_wgs84_sf)[,2]
)

# Write the WGS84 sf object to GeoJSON
st_write(coords_wgs84_sf, 
         dsn = "./src/data/coords_wgs84.geojson", 
         driver = "GeoJSON",
         delete_dsn = TRUE)  # This overwrites the file if it exists

# Extract coordinates from the geometry column
coords <- st_coordinates(coords_wgs84_sf)

# Create a data frame with node_id and coordinates
points_df <- data.frame(
  node_id = coords_wgs84_sf$node_id,
  longitude = coords[,1],
  latitude = coords[,2]
)

# Write to CSV
write.csv(points_df, 
          file = "./src/data/coords_wgs84.csv", 
          row.names = FALSE)

library(jsonlite)

# Convert the sf object to a data frame with coordinates
points_df <- data.frame(
  node_id = coords_wgs84_sf$node_id,
  longitude = st_coordinates(coords_wgs84_sf)[,1],
  latitude = st_coordinates(coords_wgs84_sf)[,2]
)

# Write to JSON
write_json(points_df, 
           "./src/data/coords_wgs84.json",
           auto_unbox = TRUE)
