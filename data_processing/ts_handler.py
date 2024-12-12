import json
import tskit
import numpy as np


def convert_metadata_to_dict(metadata_bytes):
    """Convert metadata bytes to dictionary, handling empty metadata"""
    if not metadata_bytes:
        return {}
    return json.loads(metadata_bytes.decode())


def safe_float_convert(value, default=None):
    """Safely convert a value to float, handling 'NA' and other invalid cases"""
    if value in (None, '', 'NA'):
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int_convert(value, default=None):
    """Safely convert a value to integer, handling 'NA' and other invalid cases"""
    if value in (None, '', 'NA'):
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle numpy types"""

    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def process_tree_sequence(tree_path):
    # Load the tree sequence
    ts = tskit.load(tree_path)

    # Initialize data structures for each table
    populations_data = []
    individuals_data = []
    nodes_data = []
    edges_data = []

    # Process populations
    for pop_id in range(ts.num_populations):
        pop = ts.population(pop_id)
        metadata = convert_metadata_to_dict(pop.metadata)
        populations_data.append({
            "id": pop_id,  # Keeping 0-based indexing
            "name": metadata.get("name", ""),
            "region": metadata.get("region", "")
        })

    # Process individuals and their nodes
    for ind_id in range(ts.num_individuals):
        ind = ts.individual(ind_id)
        metadata = convert_metadata_to_dict(ind.metadata)

        # Convert location to proper format
        location = None if len(ind.location) == 0 else ind.location

        individuals_data.append({
            "id": ind_id,  # Keeping 0-based indexing
            "flags": int(ind.flags),
            "location": location,
            "parents": ind.parents,
            "nodes": ind.nodes,
            "array_non_reference_discordance": safe_float_convert(metadata.get("array_non_reference_discordance")),
            "capmq": safe_int_convert(metadata.get("capmq")),
            "coverage": safe_float_convert(metadata.get("coverage")),
            "freemix": safe_float_convert(metadata.get("freemix")),
            "insert_size_average": safe_float_convert(metadata.get("insert_size_average")),
            "library": metadata.get("library", ""),
            "library_type": metadata.get("library_type", ""),
            "region": metadata.get("region", ""),
            "sample": metadata.get("sample", ""),
            "sample_accession": metadata.get("sample_accession", ""),
            "sex": metadata.get("sex", ""),
            "source": metadata.get("source", "")
        })

    # Process nodes
    for node_id in range(ts.num_nodes):
        node = ts.node(node_id)
        nodes_data.append({
            "id": node_id,  # Keeping 0-based indexing
            "flags": int(node.flags),
            "time": float(node.time),
            "population": node.population if node.population != -1 else None,  # Keep 0-based population reference
            "individual": node.individual if node.individual != -1 else None,  # Keep 0-based individual reference
            "ancestor_data_id": None  # This field isn't provided in the tree sequence
        })

    # Process edges
    for edge_id in range(ts.num_edges):
        edge = ts.edge(edge_id)
        edges_data.append({
            "id": edge_id,  # Keeping 0-based indexing
            "parent": int(edge.parent),  # Keep 0-based node reference
            "child": int(edge.child)  # Keep 0-based node reference
        })

    # Write each table to its own JSON file
    tables = {
        "populations": populations_data,
        "individuals": individuals_data,
        "nodes": nodes_data,
        "edges": edges_data
    }

    for table_name, data in tables.items():
        output_path = f"./data/{table_name}.json"
        with open(output_path, "w") as f:
            json.dump(data, f, cls=NumpyEncoder, indent=2)
        print(f"Created {output_path}")


if __name__ == "__main__":
    tree_path = "./data/trees/chr18p.trees"
    process_tree_sequence(tree_path)