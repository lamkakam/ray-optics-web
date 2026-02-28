---
name: rayoptics-api
description: How to get results from rayoptics via pyodide
---

## Paraxial Data

### First order properties

- Object (key-value pairs) for first-order data is `opm['parax_model'].opt_model['analysis_results']['parax_data'].fod`. Always convert the values to float before calling `json.dumps`

- Never use `pm.first_order_data()` as it won't work in pyodide



