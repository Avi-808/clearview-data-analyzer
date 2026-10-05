# Clearview

Drop in a spreadsheet. Clearview makes a chart and shows the key numbers. You can also ask simple questions about your data.

## Use it

1. Open `index.html` in a browser.
2. Drop a CSV or Excel file onto the page, or choose the sample data.
3. Clearview makes a chart and shows totals, averages, and high and low values.
4. Ask a question such as “Which region had the most sales?”

## Features

- Drag and drop files anywhere in the page.
- Automatically choose a useful chart and suggest findings.
- Change which data columns appear on each axis and switch between bar and line charts.
- Ask plain-language questions for common data summaries and comparisons.
- View rows and export a CSV copy.
- Analyze the selected file locally in the browser; it is not sent to an app server.

Excel files are read using the [SheetJS standalone browser library](https://docs.sheetjs.com/docs/getting-started/installation/standalone/), loaded from its official CDN. As a result, opening the app and reading Excel files requires an internet connection. CSV and TSV parsing use the same reader.

Answers are created in your browser from common questions about totals, averages, high and low values, trends, and comparisons.

