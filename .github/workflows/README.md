# GitHub Workflows

## Validate Config

This workflow automatically validates the `awesome-phala-cloud/templates/config.json` file whenever it's modified.

### What it validates:

1. **JSON Schema Validation**: Ensures the config follows the defined schema in `awesome-phala-cloud/templates/config.schema.json`
2. **Icon File Validation**: Checks that all referenced icon files exist in the `awesome-phala-cloud/templates/icons/` directory
3. **JSON Format Validation**: Verifies the JSON syntax is correct
4. **Duplicate ID Check**: Ensures no duplicate template IDs exist

### When it runs:

- On push to any branch that modifies:
  - `awesome-phala-cloud/templates/config.json`
  - `awesome-phala-cloud/templates/config.schema.json`
  - `awesome-phala-cloud/templates/validate.py`
  - `awesome-phala-cloud/templates/icons/**`
- On pull requests that modify the above files

### Requirements:

- Python 3.9+
- `jsonschema` package

### Local testing:

You can run the validation locally:

```bash
cd awesome-phala-cloud/templates
pip install jsonschema
python validate.py
```

### Workflow file:

- `.github/workflows/validate-config.yml` 