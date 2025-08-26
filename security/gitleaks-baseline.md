# Gitleaks Baseline

The `.gitleaks-baseline.json` file contains a list of acknowledged secrets so scans can pass while existing strings are reviewed.

To update the baseline after addressing findings run:

```
gitleaks detect --baseline-path .gitleaks-baseline.json --report-format json --report-path .gitleaks-baseline.json
```

This initial baseline is empty.
