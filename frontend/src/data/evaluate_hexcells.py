import geopandas as gpd
import matplotlib.pyplot as plt
from shapely.geometry import shape, Point
import numpy as np
import json


def plot_landgrid_continents():
    # Read the GeoJSON file both as GeoPandas DataFrame and raw JSON
    gdf = gpd.read_file('landgrid_wgs84_metadata.geojson')

    # Read raw JSON to access properties directly
    with open('landgrid_wgs84_metadata.geojson', 'r') as f:
        raw_data = json.load(f)

    # Create figure and axis
    fig, ax = plt.subplots(figsize=(20, 10))

    # Plot base polygons with light gray fill and black edges
    gdf.plot(ax=ax, facecolor='lightgray', edgecolor='black', alpha=0.3)

    # Create lists to store centerpoint coordinates
    centerpoint_x = []
    centerpoint_y = []

    # Process each feature
    for feature in raw_data['features']:
        # Get continent code for label
        cont_code = feature['properties']['continent_id']

        # Get geometry centroid for label placement
        geom = shape(feature['geometry'])
        centroid = geom.centroid

        # Add continent code text
        ax.text(centroid.x, centroid.y, cont_code,
                horizontalalignment='center',
                verticalalignment='center',
                fontsize=8,
                alpha=0.7)

        # Get centerpoint coordinates
        if 'centerpoint' in feature['properties']:
            cp = feature['properties']['centerpoint']
            centerpoint_x.append(cp['longitude'])
            centerpoint_y.append(cp['latitude'])

    # Plot centerpoints
    if centerpoint_x and centerpoint_y:  # Only plot if we have points
        ax.scatter(centerpoint_x, centerpoint_y,
                   c='red',  # Red color for visibility
                   s=10,  # Size of points
                   alpha=0.6,  # Slight transparency
                   marker='o',  # Circular markers
                   label='Land Centerpoints')

    # Set equal aspect ratio to prevent distortion
    ax.set_aspect('equal')

    # Set title
    plt.title('Landgrid Continent Codes with Land Centerpoints')

    # Use a basic geographic extent
    plt.xlim(-180, 180)
    plt.ylim(-90, 90)

    # Add gridlines
    ax.grid(True, linestyle='--', alpha=0.5)

    # Add legend
    plt.legend()

    # Save the plot
    plt.savefig('landgrid_continents.png', dpi=300, bbox_inches='tight')
    plt.close()


def verify_centerpoints():
    """
    Helper function to verify centerpoint data
    """
    with open('landgrid_wgs84_metadata.geojson', 'r') as f:
        data = json.load(f)

    total_cells = len(data['features'])
    cells_with_centerpoints = sum(1 for feature in data['features']
                                  if 'centerpoint' in feature['properties'])

    print(f"\nCenterpoint verification:")
    print(f"Total cells: {total_cells}")
    print(f"Cells with centerpoints: {cells_with_centerpoints}")
    print(f"Coverage: {(cells_with_centerpoints / total_cells) * 100:.2f}%")

    # Print first few centerpoints as example
    print("\nFirst 3 centerpoints:")
    for i, feature in enumerate(data['features'][:3]):
        if 'centerpoint' in feature['properties']:
            cp = feature['properties']['centerpoint']
            print(f"Cell {i + 1}: lon={cp['longitude']}, lat={cp['latitude']}")


def print_geojson_structure():
    """
    Helper function to print the structure of the GeoJSON file
    """
    print("Analyzing GeoJSON structure...")
    with open('landgrid_wgs84_metadata.geojson', 'r') as f:
        data = json.load(f)

    # Print structure of first feature
    print("\nFirst feature structure:")
    first_feature = data['features'][0]
    print(json.dumps(first_feature, indent=2))

    # Print available properties
    print("\nAvailable properties:")
    if 'properties' in first_feature:
        for key in first_feature['properties'].keys():
            print(f"- {key}")


if __name__ == "__main__":
    try:
        # First print the structure to understand what we're working with
        print_geojson_structure()

        # Verify centerpoints
        verify_centerpoints()

        print("\nCreating visualization...")
        plot_landgrid_continents()
        print("Visualization saved as 'landgrid_continents.png'")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        import traceback

        print("\nFull error traceback:")
        print(traceback.format_exc())