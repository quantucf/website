---
title: Cross-Country Predictability of Equity Anomaly Returns
description: A study of whether an equity anomaly’s returns in other countries predict its subsequent returns in a held-out country.
status: planned
topics:
  - Asset Pricing
  - Factors
  - Machine Learning
---

Equity anomalies often perform differently across markets. A signal that performs well in one country may weaken or reverse elsewhere, but its returns across other countries may still help predict its subsequent performance in a held-out market.

Publicly available, precomputed anomaly returns remove the need to reconstruct portfolios from individual securities. A hierarchical linear model and a gradient-boosting model will be compared with global and regional baseline models. Data through 2014 will be used for model training and selection, with data from 2015 onward reserved for out-of-sample evaluation. Leave-one-country-out and leave-one-anomaly-out tests will assess how well the models generalize.

The final paper and code repository will include data manifests, predictions, and out-of-sample evaluation results.
