import json
import pandas as pd
from collections import defaultdict
import time


def convert_csv_to_json(csv_file, json_file):
    """Convert CSV to JSON while preserving exact values."""
    # Read CSV with time as string to preserve exact values
    df = pd.read_csv(csv_file, dtype={'time': str})

    # Convert to the desired JSON format
    result = []
    for _, row in df.iterrows():
        result.append({
            'edge_id': int(row['edge_id']),
            'state_id': int(row['state_id']),
            'time': row['time']
        })

    # Write to JSON
    with open(json_file, 'w') as f:
        json.dump(result, f)


def check_duplicate_times(path):
    """
    Check if any time points have multiple different states.

    Args:
        path: List of (time, state_id) tuples

    Returns:
        list: Violations found, if any
    """
    # Group by time
    time_groups = defaultdict(set)
    for time, state in path:
        time_groups[time].add(state)

    # Check for multiple different states at same time
    violations = []
    for time, states in time_groups.items():
        if len(states) > 1:
            violations.append({
                'time': time,
                'states': list(states),
                'error': 'Multiple states at same time point'
            })

    return violations


def load_and_validate_migrations(georef_file, adjmat_file):
    """
    Validates migration paths against adjacency constraints.

    Args:
        georef_file (str): Path to the JSON file containing migration data
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
                valid_transitions.add((i + 1, j + 1))
                valid_transitions.add((j + 1, i + 1))  # Add both directions

    # Load migration data
    with open(georef_file, 'r') as f:
        data = json.load(f)

    # Group migrations by edge_id and sort by time
    migrations = defaultdict(list)
    for entry in data:
        migrations[entry['edge_id']].append((entry['time'], entry['state_id']))

    # Process each edge's migration path
    invalid_edges = {}

    for edge_id, path in migrations.items():
        # Check for duplicate times first
        time_violations = check_duplicate_times(path)

        # Sort path by time to ensure chronological order
        path.sort(key=lambda x: x[0])

        # Check for invalid transitions
        violations = []
        for i in range(len(path) - 1):
            current_state = path[i][1]
            next_state = path[i + 1][1]

            # Skip if staying in same state
            if current_state == next_state:
                continue

            # Check if transition is valid
            if (current_state, next_state) not in valid_transitions:
                violations.append({
                    'time_start': path[i][0],
                    'time_end': path[i + 1][0],
                    'from_state': current_state,
                    'to_state': next_state,
                    'error': 'Non-adjacent states transition'
                })

        # Combine both types of violations
        if violations or time_violations:
            invalid_edges[edge_id] = violations + time_violations

    return invalid_edges


def print_validation_results(invalid_edges):
    """
    Prints a formatted report of validation results.

    Args:
        invalid_edges (dict): Dictionary of invalid edges with their violations
    """
    if not invalid_edges:
        print("No violations found!")
        return

    print(f"Found {len(invalid_edges)} edges with violations:")
    for edge_id, violations in invalid_edges.items():
        print(f"\nEdge ID: {edge_id}")
        for v in violations:
            if v['error'] == 'Multiple states at same time point':
                print(f"  Time {v['time']}: Multiple states found: {v['states']}")
            else:
                print(f"  Time {v['time_start']} -> {v['time_end']}: "
                      f"Invalid transition from state {v['from_state']} "
                      f"to state {v['to_state']}")


# Example usage
if __name__ == "__main__":
    print("Starting CSV to JSON conversion...")
    start_time = time.time()

    # Convert CSV to JSON
    convert_csv_to_json("./data/georef-arg.csv", "./data/georef-arg-from-csv.json")

    conversion_time = time.time() - start_time
    print(f"Conversion completed in {conversion_time:.2f} seconds")

    # Run validation on the new JSON
    print("\nStarting validation...")
    start_time = time.time()

    invalid_edges = load_and_validate_migrations(
        "./data/georef-arg-from-csv.json",
        "./data/landgrid-adjmat.csv"
    )

    validation_time = time.time() - start_time
    print(f"Validation completed in {validation_time:.2f} seconds")

    print_validation_results(invalid_edges)