#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import difflib

try:
    import jsonschema
except ImportError:
    print("Error: jsonschema package is not installed. Please install it using:")
    print("pip install jsonschema")
    sys.exit(1)

def load_json_file(file_path: Path) -> dict:
    """Load a JSON file."""
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        sys.exit(1)

def load_config() -> List[Dict]:
    """Load the config.json file."""
    config_path = Path(__file__).parent / "config.json"
    return load_json_file(config_path)

def load_schema() -> Dict:
    """Load the schema file."""
    schema_path = Path(__file__).parent / "config.schema.json"
    return load_json_file(schema_path)

def get_icons_directory() -> Path:
    """Get the path to the icons directory."""
    return Path(__file__).parent / "icons"

def find_similar_filename(filename: str, available_files: List[str]) -> Optional[str]:
    """Find the most similar filename from the available files."""
    matches = difflib.get_close_matches(filename, available_files, n=1, cutoff=0.6)
    return matches[0] if matches else None

def validate_schema(config: List[Dict], schema: Dict) -> List[Dict]:
    """Validate the config against the schema."""
    schema_errors = []
    
    try:
        jsonschema.validate(instance=config, schema=schema)
    except jsonschema.exceptions.ValidationError as e:
        # For each entry, validate individually to get specific errors
        for i, entry in enumerate(config):
            try:
                jsonschema.validate(instance=entry, schema=schema["items"])
            except jsonschema.exceptions.ValidationError as entry_error:
                schema_errors.append({
                    "id": entry.get("id", f"entry-{i}"),
                    "name": entry.get("name", "unknown"),
                    "error": str(entry_error),
                    "path": ".".join(str(p) for p in entry_error.path)
                })
    
    return schema_errors

def validate_json_format(config: List[Dict]) -> bool:
    """Validate that the config is valid JSON format."""
    try:
        # This is already validated by load_json_file, but we can add additional checks here
        if not isinstance(config, list):
            print("Error: Config must be a list of objects")
            return False
        
        for i, entry in enumerate(config):
            if not isinstance(entry, dict):
                print(f"Error: Entry {i} must be an object")
                return False
        
        return True
    except Exception as e:
        print(f"Error validating JSON format: {e}")
        return False

def validate_duplicate_ids(entries: List[Dict]) -> List[str]:
    """Check for duplicate template IDs."""
    ids = [entry.get("id") for entry in entries if entry.get("id")]
    duplicates = [id for id in set(ids) if ids.count(id) > 1]
    return duplicates

def validate_icons(entries: List[Dict]) -> List[Dict]:
    """Validate that each entry with a icon field has the corresponding file."""
    icons_dir = get_icons_directory()
    errors = []
    
    # Get all files in the icons directory
    try:
        icon_files = os.listdir(icons_dir)
    except Exception as e:
        print(f"Error accessing icons directory: {e}")
        sys.exit(1)
    
    # Check each entry
    for entry in entries:
        entry_id = entry.get("id", "unknown")
        icon = entry.get("icon")
        
        if icon:
            if icon not in icon_files:
                error = {
                    "id": entry_id,
                    "name": entry.get("name", "unknown"),
                    "icon": icon,
                    "error": "Icon file not found in icons directory"
                }
                
                similar_file = find_similar_filename(icon, icon_files)
                if similar_file:
                    error["suggestion"] = similar_file
                
                errors.append(error)
            # You could add additional checks here if needed
            # For example, validate the image file type, dimensions, etc.
    
    # Check for unused icon files (optional)
    used_icons = [entry.get("icon") for entry in entries if entry.get("icon")]
    unused_icons = [f for f in icon_files if f not in used_icons]
    if unused_icons:
        print(f"Warning: Found {len(unused_icons)} unused icon files:")
        for file in unused_icons:
            print(f"  - {file}")
    
    return errors

def main():
    print("Validating Phala Cloud templates...")
    
    # Step 1: Load files
    print("1. Loading files...")
    config = load_config()
    schema = load_schema()
    
    # Step 2: Validate JSON format
    print("2. Validating JSON format...")
    if not validate_json_format(config):
        print("❌ JSON format validation failed!")
        sys.exit(1)
    else:
        print("✅ JSON format is valid!")
    
    # Step 3: Check for duplicate IDs
    print("3. Checking for duplicate IDs...")
    duplicate_ids = validate_duplicate_ids(config)
    if duplicate_ids:
        print(f"❌ Found duplicate IDs: {duplicate_ids}")
        sys.exit(1)
    else:
        print("✅ No duplicate IDs found!")
    
    # Step 4: Validate JSON schema
    print("4. Validating JSON schema...")
    schema_errors = validate_schema(config, schema)
    
    if schema_errors:
        print(f"\n❌ Found {len(schema_errors)} schema validation errors:")
        for error in schema_errors:
            print(f"  - Entry '{error['id']}' ({error['name']}): Error at '{error['path']}'")
            print(f"    {error['error']}")
        sys.exit(1)
    else:
        print("✅ Schema validation passed!")
    
    # Step 5: Validate icon files
    print("5. Validating icon files...")
    icon_errors = validate_icons(config)
    
    if icon_errors:
        print(f"\n❌ Found {len(icon_errors)} icon validation errors:")
        for error in icon_errors:
            error_msg = f"  - Entry '{error['id']}' ({error['name']}): {error['error']} - Icon: '{error['icon']}'"
            if "suggestion" in error:
                error_msg += f"\n    Did you mean: '{error['suggestion']}'?"
            print(error_msg)
        sys.exit(1)
    else:
        print("✅ All icon files are valid!")
    
    print("\n✅ All validations completed successfully!")
    sys.exit(0)

if __name__ == "__main__":
    main()
