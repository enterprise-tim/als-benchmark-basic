# Node.js Version Correlation with AsyncLocalStorage Analysis

This document shows the correlation between the versions analyzed in `NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md` and the current comprehensive configuration in `config/node-versions.json`.

## Version Coverage Strategy

The project now provides **comprehensive version coverage** with two distinct approaches:

1. **Key Milestone Versions** - Focused on AsyncLocalStorage evolution (6 versions)
2. **Comprehensive Coverage** - Full testing across all major versions (11 versions)

## Version Mapping

### Key Milestone Versions (Analysis Focus)
| Analysis Version | Config Key | Exact Version | Description | Status |
|------------------|------------|---------------|-------------|---------|
| **Node.js v16.20.2** | `16` | `16.20.2` | LTS - First version with AsyncLocalStorage stable | ✅ Matches |
| **Node.js v18.19.1** | `18` | `18.19.1` | LTS - Performance improvements and debugger context loss fixes | ✅ Matches |
| **Node.js v20.11.0** | `20` | `20.11.0` | LTS - Enhanced async context handling and nested context fixes | ✅ Matches |
| **Node.js v21.7.3** | `21` | `21.7.3` | Current - Continued optimization for high-concurrency scenarios | ✅ Matches |
| **Node.js v22.0.0** | `22_early` | `22.0.0` | Latest - Foundation for major performance overhaul | ✅ Matches |
| **Node.js v24.6.0** | `24` | `24.6.0` | Latest LTS - Revolutionary AsyncContextFrame implementation | ✅ Matches |

### Early Release Versions (Granular Testing)
| Version | Config Key | Exact Version | Description | Purpose |
|---------|------------|---------------|-------------|---------|
| **Node.js v20.0.0** | `20_early` | `20.0.0` | LTS - First 20.x release | Baseline comparison |
| **Node.js v21.0.0** | `21_early` | `21.0.0` | Current - First 21.x release | Feature introduction testing |
| **Node.js v22.18.0** | `22` | `22.18.0` | Latest 22.x - Latest stable in 22.x series | Regression testing |
| **Node.js v23.0.0** | `23` | `23.0.0` | Current - First 23.x release | Latest features testing |
| **Node.js v24.0.0** | `24_early` | `24.0.0` | Latest LTS - First 24.x release with AsyncContextFrame | Introduction testing |

## Version Sets Available

The configuration provides multiple version sets for different testing needs:

- **`analysis_versions`**: Key milestone versions focused on AsyncLocalStorage evolution
- **`key_milestones`**: Same as analysis_versions for focused testing
- **`performance_evolution`**: Core versions for performance analysis
- **`comprehensive`**: All 11 versions for thorough testing
- **`early_releases`**: First releases in major version series for granular testing
- **`lts_only`**: Only LTS versions for enterprise testing
- **`recent_only`**: Recent versions for current development focus

## Key AsyncLocalStorage Issues Addressed

Each key milestone version addresses specific critical issues:

### Node.js v16.20.2
- **Status**: Baseline stable implementation
- **Issues**: Known performance overhead, context loss with Jest testing framework
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v16.20.2/lib/async_hooks.js)

### Node.js v18.19.1
- **Status**: Performance improvements and new methods
- **Key Changes**: 
  - Fixed debugger context loss ([Issue #43148](https://github.com/nodejs/node/issues/43148))
  - Added `bind()` and `snapshot()` methods
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v18.19.1/lib/async_hooks.js)

### Node.js v20.11.0
- **Status**: Enhanced async context handling
- **Key Changes**:
  - Fixed nested async context propagation ([Issue #45848](https://github.com/nodejs/node/issues/45848))
  - Improved execution order predictability
  - Better promise resolution behavior
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v20.11.0/lib/async_hooks.js)

### Node.js v21.7.3
- **Status**: Continued optimization
- **Key Changes**:
  - Stabilized `snapshot()` method
  - Performance improvements for high-concurrency scenarios
  - Bug fixes for context propagation
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v21.7.3/lib/async_hooks.js)

### Node.js v22.0.0
- **Status**: Foundation for major performance overhaul
- **Key Changes**:
  - Fixed `AsyncResource` behavior with AsyncLocalStorage ([Issue #58204](https://github.com/nodejs/node/issues/58204))
  - Preparation for AsyncContextFrame
  - Enhanced error handling
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v22.0.0/lib/async_hooks.js)

### Node.js v24.6.0
- **Status**: Revolutionary AsyncContextFrame implementation
- **Key Changes**:
  - Complete internal rewrite with AsyncContextFrame ([PR #55552](https://github.com/nodejs/node/pull/55552))
  - Dramatic performance improvements (addresses ~97% degradation issue)
  - Backward compatibility flag: `--no-async-context-frame`
- **Repository**: [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v24.6.0/lib/async_hooks.js)

## Performance Evolution Summary

1. **v16.20.2**: Baseline stable implementation with known performance overhead
2. **v18.19.1**: Initial performance optimizations and new methods
3. **v20.11.0**: Significant async context handling improvements
4. **v21.7.3**: Continued optimization for high-concurrency scenarios
5. **v22.0.0**: Foundation for major performance overhaul
6. **v24.6.0**: **Revolutionary AsyncContextFrame implementation** - dramatic performance improvements

## Testing Strategy Benefits

### Comprehensive Coverage
- **11 versions** provide thorough testing across the Node.js ecosystem
- **Early releases** help identify when specific features or fixes were introduced
- **Latest versions** in each series catch regression issues

### Focused Analysis
- **Key milestone versions** focus on AsyncLocalStorage evolution
- **Performance evolution** tracks improvements across major releases
- **Issue correlation** links specific problems to their fixes

### Granular Testing
- **Version-to-version** comparisons within major version series
- **Feature introduction** testing to identify breaking changes
- **Regression detection** across different release patterns

## Configuration Files Updated

The following files have been updated to reflect the comprehensive approach:

- ✅ `config/node-versions.json` - Comprehensive version configuration with multiple sets
- ✅ `docs/BENCHMARK_TYPES.md` - Updated to show both focused and comprehensive approaches
- ✅ `test-versions.sh` - Fallback versions now include all 11 versions
- ✅ `README.md` - Updated to reflect comprehensive coverage
- ✅ `docker-compose.benchmark.yml` - Docker services for all versions
- ✅ `docs/VERSION_CORRELATION.md` - This document showing the comprehensive strategy

## Testing Focus Areas

Based on the comprehensive version coverage, benchmarks should focus on:

1. **Context Propagation Overhead**: How much overhead AsyncLocalStorage adds
2. **Nested Async Operations**: Performance in complex async scenarios
3. **Memory Usage**: Context tracking memory consumption
4. **Concurrent Operations**: Performance under high concurrency
5. **Integration Testing**: Behavior with timers, promises, and event emitters
6. **Version-to-Version Comparison**: Performance evolution within major version series
7. **Feature Introduction Testing**: Impact of new features and breaking changes
8. **Regression Detection**: Performance changes across different release patterns

## Expected Performance Results

### Key Milestone Versions
- **v16.20.2**: Baseline performance with highest overhead
- **v18.19.1**: Moderate improvements, especially in debugging scenarios
- **v20.11.0**: Significant improvements in async operation performance
- **v21.7.3**: Incremental improvements in high-concurrency scenarios
- **v22.0.0**: Similar to v21.7.3 but with better AsyncResource behavior
- **v24.6.0**: **Dramatic performance improvement** - should show the largest performance gains

### Early Release Versions
- **v20.0.0 vs v20.11.0**: Measure improvements within v20 series
- **v21.0.0 vs v21.7.3**: Track optimization progress in v21 series
- **v22.0.0 vs v22.18.0**: Monitor stability improvements in v22 series
- **v24.0.0 vs v24.6.0**: Measure AsyncContextFrame refinements

## Breaking Changes to Watch For

- **v24.0.0+**: Some `AsyncResource` usage patterns may require code changes
- **v24.0.0+**: Use `--no-async-context-frame` flag as temporary workaround if issues occur
- **v22.0.0+**: `AsyncResource` behavior changes may affect existing instrumentations
- **Early releases**: May introduce experimental features or breaking changes

## References

- [NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md](./NODEJS_ASYNCLOCALSTORAGE_ANALYSIS.md) - Detailed analysis document
- [Node.js GitHub Repository](https://github.com/nodejs/node)
- [AsyncLocalStorage Documentation](https://nodejs.org/api/async_context.html)
- [Performance Issue Discussion](https://github.com/nodejs/node/issues/34493)
- [Context Loss Issues](https://github.com/nodejs/node/issues/43148)
- [AsyncResource Behavior Changes](https://github.com/nodejs/node/issues/58204)
- [AsyncContextFrame Implementation](https://github.com/nodejs/node/pull/55552)

---

*This correlation document was generated on $(date) to ensure comprehensive version coverage while maintaining focus on key AsyncLocalStorage evolution.*
