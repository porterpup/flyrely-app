# FlyRely App - Complete MVP Implementation

This project contains the **complete FlyRely MVP** built with TanStack Start, covering all screens from your Figma design system.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 📁 Project Structure

... (unchanged)

## Notes

- Thresholds for mapping model probability → risk level were calibrated to match model outputs.
  - Calibration v2 thresholds (updated):
    - Low: probability < 0.20
    - Medium: 0.20 ≤ probability < 0.30
    - High: probability ≥ 0.30
- The frontend uses `toRiskLevel` in `src/lib/api.ts` to map API probabilities to UI risk levels.
- Ensure the backend `/predict` endpoint uses the same thresholds to set `risk_level` in responses.
