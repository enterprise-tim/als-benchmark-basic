# GitHub Actions Runner Configuration

## Standardized Runner Type

All workflows in this repository use **`ubuntu-latest-4-cores`** as the standard runner type for consistent performance testing.

### Runner Specifications
- **CPU**: 4 vCPUs
- **Memory**: 16 GB RAM  
- **Storage**: 150 GB SSD
- **OS**: Ubuntu (latest stable)

### Why 4-core runners?

1. **Consistent Performance**: 4-core runners provide sufficient resources for AsyncLocalStorage benchmarking while maintaining consistency across test runs
2. **Cost Efficiency**: Balances performance needs with resource costs
3. **Realistic Environment**: Represents a common production server configuration
4. **Parallel Processing**: Adequate cores for concurrent Node.js operations testing

### Workflow Files Using This Configuration

- `benchmark.yml` - Main AsyncLocalStorage benchmarks
- `performance-tests-enterprise.yml` - Enterprise-grade performance testing
- `pages.yml` - GitHub Pages deployment
- `debug-runners.yml` - Runner debugging and diagnostics

### Configuration Reference

The shared configuration is defined in `.github/workflows/config.yml` and can be referenced by other workflows if needed.

### Customization

For specific workflows that need different runner types, you can override the default by:

1. Using workflow inputs (as in `performance-tests-enterprise.yml`)
2. Modifying the `runs-on` field directly in the workflow file

### Migration Notes

All workflows have been updated from various runner types (`ubuntu-latest`, `ubuntu-latest-16-cores`) to the standardized `ubuntu-latest-4-cores` configuration.
