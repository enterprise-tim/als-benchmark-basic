# Node.js Version Management

This project uses a **centralized configuration system** for managing Node.js versions across all scripts, workflows, and Docker configurations.

## 📁 Configuration Files

### `config/node-versions.json`
The single source of truth for all Node.js versions used in this project.

```json
{
  "versions": {
    "22": {
      "exact": "22.18.0",
      "major": "22",
      "description": "Latest 22.x - Latest stable in 22.x series",
      "lts": false,
      "active": true
    }
  },
  "sets": {
    "all": ["16", "18", "20", "21", "22", "24"],
    "enterprise": ["18", "20", "22", "24"]
  }
}
```

### `scripts/get-node-versions.js`
Helper script that reads the configuration and outputs versions in various formats.

## 🔧 Usage

### Command Line
```bash
# Get all versions as JSON array
node scripts/get-node-versions.js json all

# Get enterprise versions as CSV
node scripts/get-node-versions.js csv enterprise

# Get versions for bash arrays
node scripts/get-node-versions.js bash-array all

# Get versions for GitHub workflows
node scripts/get-node-versions.js yaml-inline enterprise
```

### Available Formats
- `json` - JSON array (default)
- `csv` - Comma-separated values
- `bash-array` - Bash array format
- `yaml-array` - YAML multi-line array
- `yaml-inline` - YAML inline array
- `list` - Newline-separated list
- `docker-major` - Major versions only

### Available Sets
- `all` - All active versions
- `lts_only` - Only LTS versions  
- `enterprise` - Enterprise testing versions
- `basic` - Basic testing versions

## 📂 Files Using Centralized Configuration

### ✅ Updated Files
- `test-versions.sh` - Uses centralized config with fallback
- `.github/workflows/performance-tests-enterprise.yml` - Updated to 22.18.0
- `.github/workflows/benchmark.yml` - Updated to 22.18.0

### 🔄 Files That Could Be Updated
- `docker-compose.benchmark.yml` - Uses generic major versions
- `Dockerfile.benchmark` - Hardcoded to Node 22

## 🚀 Benefits

1. **Single Source of Truth**: All version definitions in one place
2. **Consistency**: No more version mismatches between files
3. **Easy Updates**: Change versions once, update everywhere
4. **Flexibility**: Different version sets for different use cases
5. **Fallback Support**: Scripts work even if config is unavailable

## 📝 How to Update Versions

1. **Update the config**: Edit `config/node-versions.json`
2. **Test the helper**: Run `node scripts/get-node-versions.js json all`
3. **Regenerate files**: Scripts automatically use new versions
4. **Manual updates**: Some files may need manual updates (Docker, etc.)

## 🔍 Version Sets Explained

- **`all`**: Every active version for comprehensive testing
- **`lts_only`**: Only LTS versions for stable environments
- **`enterprise`**: Curated set for enterprise CI/CD (excludes experimental)
- **`basic`**: Minimal set for quick testing

## 🛠 Maintenance

### Adding a New Version
```json
{
  "25": {
    "exact": "25.0.0",
    "major": "25", 
    "description": "Latest experimental",
    "lts": false,
    "active": true
  }
}
```

### Deactivating a Version
```json
{
  "16": {
    "exact": "16.20.2",
    "major": "16",
    "description": "LTS - End of life",
    "lts": true,
    "active": false  // Set to false
  }
}
```

### Updating Metadata
```json
{
  "metadata": {
    "last_updated": "2025-01-15",
    "update_source": "https://nodejs.org/dist/index.json"
  }
}
```

## 🔗 Integration Examples

### Bash Script Integration
```bash
# Load versions from centralized config
mapfile -t VERSIONS < <(node scripts/get-node-versions.js list enterprise)
```

### GitHub Workflow Integration
```yaml
strategy:
  matrix:
    node-version: [18.19.1, 20.11.0, 22.18.0, 24.6.0]  # From: node scripts/get-node-versions.js yaml-inline enterprise
```

### Docker Integration
```dockerfile
ARG NODE_VERSION=22  # From: node scripts/get-node-versions.js docker-major | head -1
FROM node:${NODE_VERSION}-slim
```

## 🎯 Future Improvements

- [ ] Auto-update script that fetches latest versions from Node.js API
- [ ] GitHub Action to automatically update versions weekly
- [ ] Validation script to ensure all files use consistent versions
- [ ] Integration with package.json engines field
