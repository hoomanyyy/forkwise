---
name: data-analysis
title: Data analysis and charts
category: Research
description: Load, clean and analyze data files (CSV, Excel, JSON, databases) and produce verified numbers and clear charts. Use for any question about a dataset.
---
# Data analysis and charts

## 1. Load and look
- Use pandas. Read the file, then print shape, dtypes, the first rows, missing values per column and a few value_counts. Excel: list the sheets first.
- Ask yourself what one row represents. Check for duplicates of that key.

## 2. Clean, and say what you changed
- Fix types (dates with pd.to_datetime, numbers stored as text with currency signs or thousands separators), trim text, unify categories, handle missing values on purpose (drop, fill or keep), remove exact duplicates.
- Keep the raw file untouched; write cleaned data to a new file.

## 3. Analyze
- Answer the user's question directly with groupby, pivot tables and simple statistics. Show counts next to averages so small groups are visible.
- Check every headline number a second way (a different calculation or a manual spot check of a few rows).
- Be careful with causation; describe correlations as correlations.

## 4. Charts
- matplotlib or seaborn for images, plotly for interactive HTML. One message per chart.
- Bar for comparing categories, line for time, scatter for relations, histogram for distributions. Sorted bars, labeled axes with units, a title that states the finding, no 3D, no pie charts with more than five slices.
- Save as PNG at 150 dpi or more and show it to the user.

## 5. Deliver
Lead with the findings in plain words and numbers. Provide the cleaned data, the charts and, when useful, an Excel file with the summary tables (openpyxl or xlsxwriter with formatted headers and column widths).
