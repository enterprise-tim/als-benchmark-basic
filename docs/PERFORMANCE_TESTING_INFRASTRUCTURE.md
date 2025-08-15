# Performance Testing Infrastructure Guide

This document outlines the various performance testing options available for AsyncLocalStorage benchmarks, ranging from standard GitHub Actions to enterprise-grade dedicated compute resources.

## Overview of Testing Options

### 1. Standard GitHub Actions (Free/Team)
**File**: `.github/workflows/performance-tests.yml`
- **Runner**: `ubuntu-latest` (2 vCPUs, 7 GB RAM)
- **Cost**: Free for public repos, included minutes for private repos
- **Use Case**: Basic performance monitoring, development testing
- **Reliability**: Moderate (shared infrastructure)

### 2. GitHub Larger Runners (Team/Enterprise)
**File**: `.github/workflows/performance-tests-enterprise.yml`
- **Runners**: Up to 64 vCPUs, 256 GB RAM, 2TB SSD
- **Cost**: Pay-per-minute usage
- **Use Case**: High-fidelity performance testing, production validation
- **Reliability**: High (dedicated resources during execution)

### 3. Self-Hosted Runners (Any Plan)
**File**: `.github/workflows/performance-tests-self-hosted.yml`
- **Runners**: Your own hardware/cloud instances
- **Cost**: Infrastructure costs only
- **Use Case**: Maximum control, specialized hardware, cost optimization
- **Reliability**: Highest (dedicated, controlled environment)

## GitHub Larger Runners Details

### Available Runner Types

| Runner Type | vCPUs | RAM | SSD Storage | Use Case |
|-------------|-------|-----|-------------|----------|
| `ubuntu-latest-4-cores` | 4 | 16 GB | 150 GB | Development testing |
| `ubuntu-latest-8-cores` | 8 | 32 GB | 300 GB | **Recommended for AsyncLocalStorage** |
| `ubuntu-latest-16-cores` | 16 | 64 GB | 600 GB | Intensive benchmarking |
| `ubuntu-latest-32-cores` | 32 | 128 GB | 1200 GB | Enterprise-grade testing |
| `ubuntu-latest-64-cores` | 64 | 256 GB | 2040 GB | Maximum performance |

### Pricing (Approximate)
- **4-core**: ~$0.008/minute
- **8-core**: ~$0.016/minute  
- **16-core**: ~$0.032/minute
- **32-core**: ~$0.064/minute
- **64-core**: ~$0.128/minute

*Note: Prices vary by region and are subject to change. Check GitHub's current pricing.*

### How to Enable Larger Runners

1. **Requirements**:
   - GitHub Team or Enterprise Cloud plan
   - Repository admin access
   - Billing setup for pay-per-use

2. **Setup Steps**:
   ```bash
   # 1. Go to repository Settings > Actions > Runners
   # 2. Click "New runner" > "New GitHub-hosted runner"
   # 3. Select runner specifications
   # 4. Configure runner group (Enterprise only)
   # 5. Update workflow file to use new runner
   ```

3. **Workflow Configuration**:
   ```yaml
   jobs:
     performance-tests:
       runs-on: ubuntu-latest-8-cores  # Use your configured runner
   ```

## Self-Hosted Runner Setup

### Recommended Hardware Specifications

#### Minimum Configuration
- **CPU**: 8 cores, 3.0+ GHz
- **RAM**: 32 GB
- **Storage**: 500 GB NVMe SSD
- **Network**: Stable, low-latency connection

#### Optimal Configuration
- **CPU**: 16+ cores, 3.5+ GHz (Intel Xeon or AMD EPYC)
- **RAM**: 64+ GB
- **Storage**: 1TB+ NVMe SSD
- **Network**: Dedicated connection, <1ms jitter

### Cloud Provider Options

#### AWS EC2 Recommendations
```bash
# High-performance instances for benchmarking
c5.4xlarge    # 16 vCPUs, 32 GB RAM - Balanced
c5.9xlarge    # 36 vCPUs, 72 GB RAM - High performance
c5.18xlarge   # 72 vCPUs, 144 GB RAM - Maximum performance

# Memory-optimized for large datasets
r5.4xlarge    # 16 vCPUs, 128 GB RAM
r5.8xlarge    # 32 vCPUs, 256 GB RAM
```

#### Setup Script for AWS EC2
```bash
#!/bin/bash
# EC2 self-hosted runner setup for performance testing

# Install dependencies
sudo apt update
sudo apt install -y curl wget git build-essential

# Install Node.js versions via NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18.19.1
nvm install 20.11.0
nvm install 22.0.0
nvm install 24.6.0

# Download and configure GitHub Actions runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure runner (requires GitHub token)
./config.sh --url https://github.com/your-org/async-node-stats --token YOUR_TOKEN --labels self-hosted,performance,dedicated

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

#### Google Cloud Platform
```bash
# Compute-optimized instances
c2-standard-16   # 16 vCPUs, 64 GB RAM
c2-standard-30   # 30 vCPUs, 120 GB RAM
c2-standard-60   # 60 vCPUs, 240 GB RAM
```

#### Azure
```bash
# Compute-optimized instances
Standard_F16s_v2   # 16 vCPUs, 32 GB RAM
Standard_F32s_v2   # 32 vCPUs, 64 GB RAM
Standard_F64s_v2   # 64 vCPUs, 128 GB RAM
```

## Third-Party Managed Runner Services

### Namespace
- **Features**: High-performance runners, integrated caching
- **Pricing**: Competitive with GitHub larger runners
- **Specialties**: ARM support, reliable performance
- **Setup**: Simple GitHub App installation

### BuildJet
- **Features**: 2x faster builds, ARM support
- **Pricing**: 50-90% cheaper than GitHub
- **Specialties**: Container optimization, cache layers
- **Setup**: GitHub marketplace integration

### WarpBuild
- **Features**: Unlimited concurrency, container caching
- **Pricing**: Per-second billing
- **Specialties**: Container layer caching, multi-arch
- **Setup**: Dashboard configuration

### Depot
- **Features**: Up to 3x faster than GitHub-hosted
- **Pricing**: Per-second billing, single-tenant
- **Specialties**: Fully managed, optimized for performance
- **Setup**: GitHub App with dashboard

## Performance Testing Strategy by Use Case

### Development & CI/CD
```yaml
# Use standard GitHub runners for quick feedback
runs-on: ubuntu-latest
# 5 iterations, basic statistical analysis
```

### Release Validation
```yaml
# Use larger runners for comprehensive testing
runs-on: ubuntu-latest-8-cores  
# 10-15 iterations, full statistical analysis
```

### Performance Research
```yaml
# Use self-hosted or largest GitHub runners
runs-on: [self-hosted, performance, dedicated]
# 20+ iterations, comprehensive analysis
```

### Production Monitoring
```yaml
# Scheduled runs on larger runners
runs-on: ubuntu-latest-16-cores
# Trend analysis, regression detection
```

## Cost Optimization Strategies

### 1. Hybrid Approach
- **Daily CI**: Standard runners
- **Release testing**: Larger runners
- **Deep analysis**: Self-hosted

### 2. Scheduled Testing
```yaml
# Run expensive tests during off-peak hours
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
```

### 3. Conditional Execution
```yaml
# Only run expensive tests on main branch
if: github.ref == 'refs/heads/main'
```

### 4. Matrix Optimization
```yaml
# Reduce matrix size for expensive runners
strategy:
  matrix:
    node-version: [20.11.0, 24.6.0]  # Test fewer versions
```

## Monitoring and Alerting

### Performance Regression Detection
```yaml
# Set up automated alerts for performance regressions
- name: Check performance regression
  run: |
    if [ "$OVERHEAD_INCREASE" -gt "10" ]; then
      echo "::error::Performance regression detected: +$OVERHEAD_INCREASE%"
      exit 1
    fi
```

### Dashboard Integration
- **GitHub Pages**: Host performance trends
- **Grafana**: Time-series performance monitoring
- **Slack/Teams**: Automated notifications

## Security Considerations

### Self-Hosted Runners
- Use dedicated, isolated machines
- Regular security updates
- Network segmentation
- Access control and monitoring

### Larger Runners
- GitHub-managed security
- Isolated execution environment
- Automatic cleanup after jobs

## Troubleshooting Common Issues

### High Variability in Results
1. **Check system load** during test execution
2. **Increase iterations** for better statistics
3. **Use dedicated runners** to eliminate noise
4. **Add cooldown periods** between tests

### Runner Availability
1. **Set up fallback runners** in workflow
2. **Use runner groups** for better allocation
3. **Monitor runner health** and availability

### Cost Management
1. **Set billing alerts** in GitHub
2. **Monitor usage patterns** regularly  
3. **Optimize test frequency** based on needs
4. **Use workflow conditionals** to limit expensive runs

## Recommendations by Organization Size

### Individual Developer / Small Team
- **Primary**: Standard GitHub Actions
- **Validation**: Occasional larger runner usage
- **Cost**: Free to minimal

### Medium Team / Startup
- **Primary**: GitHub larger runners (8-core)
- **Research**: Self-hosted for deep analysis
- **Cost**: $50-200/month

### Enterprise
- **Primary**: Self-hosted dedicated infrastructure
- **Backup**: GitHub larger runners
- **Cost**: Optimized for scale and control

## Getting Started

### Step 1: Choose Your Approach
1. **Budget-conscious**: Start with standard GitHub Actions
2. **Quality-focused**: Use 8-core larger runners
3. **Control-needed**: Set up self-hosted runners

### Step 2: Configure Workflows
1. Copy the appropriate workflow file
2. Adjust configuration for your needs
3. Set up any required runner infrastructure

### Step 3: Monitor and Optimize
1. Run initial tests to establish baselines
2. Monitor cost and performance metrics
3. Adjust strategy based on results

## Support and Resources

- **GitHub Actions Documentation**: [docs.github.com/actions](https://docs.github.com/actions)
- **Larger Runners Guide**: [GitHub Enterprise Documentation](https://docs.github.com/enterprise-cloud@latest/actions)
- **Self-hosted Runner Setup**: [GitHub Self-hosted Runners](https://docs.github.com/actions/hosting-your-own-runners)
- **Community**: GitHub Actions community forums

---

*This infrastructure guide provides multiple pathways to achieve reliable, high-quality performance testing for AsyncLocalStorage benchmarks. Choose the approach that best fits your requirements for budget, control, and performance needs.*
