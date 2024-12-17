import json
import pandas as pd
from collections import defaultdict


def load_and_validate_migrations_v2(georef_file, adjmat_file):
    """
    Validates migration paths against adjacency constraints for nested JSON format.

    Args:
        georef_file (str): Path to the JSON file containing nested migration data
        adjmat_file (str): Path to the CSV file containing the adjacency matrix

    Returns:
        dict: Dictionary of invalid edges with their violations
    """
    # Load the adjacency matrix and drop only the first column (index column)
    adj_df = pd.read_csv(adjmat_file)
    adj_df = adj_df.iloc[:, 1:]  # Drop only first column

    # Clear row and column names
    adj_df.index = range(len(adj_df))
    adj_df.columns = range(len(adj_df.columns))

    # Convert adjacency matrix to a set of valid transitions for faster lookup
    valid_transitions = set()
    for i in range(len(adj_df)):
        for j in range(len(adj_df.columns)):
            if adj_df.iloc[i, j] == 1:
                # Add 1 to convert to 1-based state_ids
                valid_transitions.add((i + 1, j + 1))
                valid_transitions.add((j + 1, i + 1))  # Add both directions

    # Load the migration data
    with open(georef_file, 'r') as f:
        edges = json.load(f)

    # Process each edge's migration path
    invalid_edges = {}

    for edge in edges:
        edge_id = edge['edge_id']
        entries = edge['entries']

        # Sort entries by time to ensure chronological order
        entries.sort(key=lambda x: x['time'])

        # Check for invalid transitions
        violations = []
        for i in range(len(entries) - 1):
            current_state = entries[i]['state_id']
            next_state = entries[i + 1]['state_id']

            # Skip if staying in same state
            if current_state == next_state:
                continue

            # Check if transition is valid
            if (current_state, next_state) not in valid_transitions:
                violations.append({
                    'time_start': entries[i]['time'],
                    'time_end': entries[i + 1]['time'],
                    'from_state': current_state,
                    'to_state': next_state,
                    'error': 'Non-adjacent states transition'
                })

        if violations:
            invalid_edges[edge_id] = violations

    return invalid_edges


def print_validation_results(invalid_edges):
    """
    Prints a formatted report of validation results.

    Args:
        invalid_edges (dict): Dictionary of invalid edges with their violations
    """
    if not invalid_edges:
        print("No invalid migrations found!")
        return

    print(f"Found {len(invalid_edges)} edges with invalid migrations:")
    for edge_id, violations in invalid_edges.items():
        print(f"\nEdge ID: {edge_id}")
        for v in violations:
            print(f"  Time {v['time_start']:.4f} -> {v['time_end']:.4f}: "
                  f"Invalid transition from state {v['from_state']} "
                  f"to state {v['to_state']}")


# Example usage
if __name__ == "__main__":
    invalid_edges = load_and_validate_migrations_v2(
        "./data/test.json",
        "./data/landgrid-adjmat.csv"
    )
    print_validation_results(invalid_edges)