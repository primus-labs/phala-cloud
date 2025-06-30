# GitHub Workflows

## Validate Config

This workflow automatically validates the `templates/config.json` file whenever it's modified.

### What it validates:

1. **JSON Schema Validation**: Ensures the config follows the defined schema in `config.schema.json`
2. **Icon File Validation**: Checks that all referenced icon files exist in the `templates/icons/` directory
3. **JSON Format Validation**: Verifies the JSON syntax is correct
4. **Duplicate ID Check**: Ensures no duplicate template IDs exist

### When it runs:

- On push to any branch that modifies:
  - `templates/config.json`
  - `templates/config.schema.json`
  - `templates/validate.py`
  - `templates/icons/**`
- On pull requests that modify the above files

### Requirements:

- Python 3.9+
- `jsonschema` package

### Local testing:

You can run the validation locally:

```bash
cd templates
pip install jsonschema
python validate.py
```

### Workflow file:

- `.github/workflows/validate-config.yml` 