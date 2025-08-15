# AsyncLocalStorage Changes Analysis Across Node.js Versions

This document provides a comprehensive analysis of AsyncLocalStorage changes across the Node.js versions tested in `test-versions.sh`, including code-level modifications and links to relevant files in the Node.js repository.

## Overview

AsyncLocalStorage is a crucial feature in Node.js that provides asynchronous context tracking, allowing developers to maintain state across asynchronous operations. This analysis covers the evolution of AsyncLocalStorage across the following versions tested in our benchmark suite:

- Node.js v16.20.2 (LTS - First version with AsyncLocalStorage stable)
- Node.js v18.19.1 (LTS - Performance improvements)
- Node.js v20.11.0 (LTS - Latest stable)
- Node.js v21.7.3 (Current - Latest features)
- Node.js v22.0.0 (Latest - Cutting edge)
- Node.js v24.6.0 (Latest LTS - Most recent)

## Key Files in Node.js Repository

The primary implementation of AsyncLocalStorage can be found in:
- **Main Implementation**: [`lib/async_hooks.js`](https://github.com/nodejs/node/blob/main/lib/async_hooks.js)
- **Internal Implementation**: [`lib/internal/async_hooks.js`](https://github.com/nodejs/node/blob/main/lib/internal/async_hooks.js)
- **Tests**: [`test/parallel/test-async-local-storage*.js`](https://github.com/nodejs/node/tree/main/test/parallel)
- **Documentation**: [`doc/api/async_context.md`](https://github.com/nodejs/node/blob/main/doc/api/async_context.md)

## Version-by-Version Analysis

### Node.js v16.20.2 (LTS - June 2023)

**Status**: Stable AsyncLocalStorage implementation

**Key Characteristics**:
- AsyncLocalStorage was already marked as stable since v16.4.0
- Contains the foundational implementation with core methods:
  - `run(store, callback[, ...args])`
  - `getStore()`
  - `enterWith(store)`
  - `exit(callback[, ...args])`
  - `disable()`

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v16.20.2/lib/async_hooks.js)
- [Test Suite](https://github.com/nodejs/node/blob/v16.20.2/test/parallel/)

**Notable Issues in v16.x**:
- Context loss with Jest testing framework ([Issue #11435](https://github.com/jestjs/jest/issues/11435))
- Some edge cases with debugger attachment

### Node.js v18.19.1 (LTS - February 2024)

**Major Changes from v16.20.2**:

1. **Debugger Context Loss Fix**:
   - Fixed issue where attaching a debugger after using `await` caused AsyncLocalStorage to lose context
   - **Issue**: [#43148](https://github.com/nodejs/node/issues/43148)

2. **Introduction of `bind()` and `snapshot()` Methods** (v18.16.0):
   - `AsyncLocalStorage.bind(fn)`: Binds a function to current execution context
   - `AsyncLocalStorage.snapshot()`: Captures current execution context and returns wrapper function
   - **File**: [`lib/async_hooks.js`](https://github.com/nodejs/node/blob/v18.19.1/lib/async_hooks.js)

3. **Performance Optimizations**:
   - Improved context propagation mechanism
   - Better handling of nested async operations

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v18.19.1/lib/async_hooks.js)
- [Comparison with v16.20.2](https://github.com/nodejs/node/compare/v16.20.2...v18.19.1)

### Node.js v20.11.0 (LTS - February 2024)

**Major Changes from v18.19.1**:

1. **Enhanced Async Context Handling**:
   - Significant improvements in async context handling for `setTimeout`, `setImmediate`, and event emitters
   - More predictable behavior in execution order
   - **Discussion**: [Stack Overflow Analysis](https://stackoverflow.com/questions/79585777/node-js-asynclocalstorage-official-example-actual-execution-order-differs-from)

2. **Bug Fixes for Context Propagation**:
   - Fixed inconsistent propagation of nested async contexts
   - Improved promise resolution behavior with AsyncLocalStorage
   - **Issue**: [#45848](https://github.com/nodejs/node/issues/45848)

3. **Internal Implementation Refinements**:
   - Better memory management for context tracking
   - Reduced overhead in context switching

**Performance Impact**:
- Addressed known performance issues where AsyncLocalStorage could cause up to 97% performance degradation in some async scenarios
- **Issue**: [#34493](https://github.com/nodejs/node/issues/34493)

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v20.11.0/lib/async_hooks.js)
- [Comparison with v18.19.1](https://github.com/nodejs/node/compare/v18.19.1...v20.11.0)

### Node.js v21.7.3 (Current - April 2024)

**Major Changes from v20.11.0**:

1. **Stabilization of `snapshot()` Method**:
   - The `snapshot()` method was marked as stable (no longer experimental)
   - Enhanced reliability for context capture scenarios

2. **Internal Optimizations**:
   - Further performance improvements in context tracking
   - Better handling of high-concurrency scenarios

3. **Bug Fixes**:
   - Various edge case fixes for context propagation
   - Improved error handling in async context operations

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v21.7.3/lib/async_hooks.js)
- [Comparison with v20.11.0](https://github.com/nodejs/node/compare/v20.11.0...v21.7.3)

### Node.js v22.0.0 (Latest - April 2024)

**Major Changes from v21.7.3**:

1. **AsyncResource Behavior Modification**:
   - Fixed `AsyncResource` behavior with AsyncLocalStorage to prevent unintended state mutations
   - `AsyncResource` now captures state at construction and restores it around each run
   - **Issue**: [#58204](https://github.com/nodejs/node/issues/58204)

2. **Preparation for AsyncContextFrame**:
   - Internal refactoring in preparation for the switch to `AsyncContextFrame` (implemented in v24.0.0)
   - Foundation work for significant performance improvements

3. **Enhanced Error Handling**:
   - Better error propagation in async context scenarios
   - Improved debugging support

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v22.0.0/lib/async_hooks.js)
- [Comparison with v21.7.3](https://github.com/nodejs/node/compare/v21.7.3...v22.0.0)

### Node.js v24.6.0 (Latest LTS - August 2024)

**Major Changes from v22.0.0**:

1. **AsyncContextFrame Implementation** (v24.0.0):
   - **Revolutionary Change**: Complete internal rewrite to use `AsyncContextFrame` instead of traditional async hooks
   - **Performance**: Dramatic performance improvements - addresses the ~97% performance degradation issue
   - **Reliability**: Fixes context mixing issues during concurrent API calls
   - **Pull Request**: [#55552](https://github.com/nodejs/node/pull/55552)

2. **Backward Compatibility Flag** (v24.0.1):
   - **Flag**: `--no-async-context-frame` introduced to revert to old behavior if needed
   - **Reason**: Some existing code using `AsyncResource` with `AsyncLocalStorage` may break
   - **Issue**: [#58204](https://github.com/nodejs/node/issues/58204)

3. **Context Management Improvements**:
   - Eliminates context loss in high-concurrency scenarios
   - Better performance under heavy async workloads
   - More predictable behavior across all async operations

4. **Stability Enhancements** (v24.6.0):
   - Refinements to the AsyncContextFrame implementation
   - Bug fixes for edge cases discovered after v24.0.0 release
   - Enhanced error handling and debugging support

**Performance Impact**:
- **Expected Improvement**: Significant performance gains, especially in async-heavy applications
- **Context Switching**: Dramatically reduced overhead for context switching operations
- **Memory Usage**: More efficient memory management for context tracking
- **Concurrency**: Better handling of concurrent async operations without context loss

**Breaking Changes**:
- Some `AsyncResource` usage patterns may require code changes
- Applications should test thoroughly when upgrading from v22.x
- Use `--no-async-context-frame` flag as temporary workaround if issues occur

**Repository Links**:
- [AsyncLocalStorage Implementation](https://github.com/nodejs/node/blob/v24.6.0/lib/async_hooks.js)
- [AsyncContextFrame Pull Request](https://github.com/nodejs/node/pull/55552)
- [Comparison with v22.0.0](https://github.com/nodejs/node/compare/v22.0.0...v24.6.0)
- [v24.0.0 Release Notes](https://github.com/nodejs/node/releases/tag/v24.0.0)
- [v24.6.0 Release Notes](https://github.com/nodejs/node/releases/tag/v24.6.0)

## Summary of Major Changes

### Performance Evolution
1. **v16.20.2**: Baseline stable implementation with known performance overhead
2. **v18.19.1**: Initial performance optimizations and new methods
3. **v20.11.0**: Significant async context handling improvements
4. **v21.7.3**: Continued optimization for high-concurrency scenarios
5. **v22.0.0**: Foundation for major performance overhaul
6. **v24.6.0**: Revolutionary AsyncContextFrame implementation - dramatic performance improvements

### API Evolution
1. **v16.20.2**: Core methods (`run`, `getStore`, `enterWith`, `exit`, `disable`)
2. **v18.19.1**: Added `bind()` and `snapshot()` methods
3. **v20.11.0**: Enhanced existing method behavior
4. **v21.7.3**: Stabilized `snapshot()` method
5. **v22.0.0**: Refined `AsyncResource` integration
6. **v24.6.0**: Same API surface, completely rewritten internal implementation with AsyncContextFrame

### Key Issues Addressed
1. **Debugger Context Loss** (v18.x): Fixed context loss when attaching debugger after `await`
2. **Execution Order Predictability** (v20.x): Made async operation behavior more consistent
3. **Nested Context Propagation** (v20.x): Fixed inconsistent propagation in complex async scenarios
4. **AsyncResource Integration** (v22.x): Prevented unintended state mutations
5. **Performance Overhead** (v24.x): Revolutionary AsyncContextFrame implementation eliminates ~97% performance degradation

## Testing Implications

When comparing performance across these versions, you should expect:

1. **v16.20.2**: Baseline performance with highest overhead
2. **v18.19.1**: Moderate improvements, especially in debugging scenarios
3. **v20.11.0**: Significant improvements in async operation performance
4. **v21.7.3**: Incremental improvements in high-concurrency scenarios
5. **v22.0.0**: Similar to v21.7.3 but with better AsyncResource behavior
6. **v24.6.0**: **Dramatic performance improvement** - should show the largest performance gains of any version

## Performance Testing Focus Areas

Based on the version changes, your benchmarks should particularly focus on:

1. **Context Propagation Overhead**: How much overhead AsyncLocalStorage adds
2. **Nested Async Operations**: Performance in complex async scenarios
3. **Memory Usage**: Context tracking memory consumption
4. **Concurrent Operations**: Performance under high concurrency
5. **Integration Testing**: Behavior with timers, promises, and event emitters

## Future Considerations

Node.js v24.6.0 represents the culmination of years of AsyncLocalStorage evolution with the AsyncContextFrame implementation. This version should show the most dramatic performance improvements compared to all previous versions. Future versions are likely to build on this foundation with incremental improvements and bug fixes.

**Key Testing Expectations for v24.6.0**:
- Significantly reduced AsyncLocalStorage overhead compared to all previous versions
- Better performance scaling under high concurrency
- More consistent behavior across different async operation types
- Potential breaking changes requiring testing with existing AsyncResource usage patterns

## References

- [Node.js GitHub Repository](https://github.com/nodejs/node)
- [AsyncLocalStorage Documentation](https://nodejs.org/api/async_context.html)
- [Performance Issue Discussion](https://github.com/nodejs/node/issues/34493)
- [Context Loss Issues](https://github.com/nodejs/node/issues/43148)
- [AsyncResource Behavior Changes](https://github.com/nodejs/node/issues/58204)
- [AsyncContextFrame Implementation](https://github.com/nodejs/node/pull/55552)
- [Node.js v24.0.0 Release Notes](https://github.com/nodejs/node/releases/tag/v24.0.0)

---

*This analysis was generated on $(date) as part of the AsyncLocalStorage performance testing suite.*
