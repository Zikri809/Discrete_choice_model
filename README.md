# Transport Mode Choice Explorer

Static web app version of the discrete choice model, ready for GitHub Pages.

## Files

- `index.html` - app structure
- `styles.css` - layout and styling
- `script.js` - survey flow, validation, aggregation, normalization, and probability calculations

## Survey Flow

For each respondent, the app:

1. collects transport method ratings for all four attributes on a `1-5` scale
2. collects attribute importance rankings on a `1-4` scale
3. enforces that each rank can only be used once for that respondent
4. moves to the next respondent

After all respondents are entered, the app:

- aggregates the attribute rankings
- converts the average ranking to a `0-1` dynamic weight using `(rank - 1) / (4 - 1)`
- computes utilities
- computes multinomial logit choice probabilities

## Deploy To GitHub Pages

1. Create a GitHub repository and upload these files to the repository root.
2. Open the repository on GitHub.
3. Go to `Settings > Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select your branch, usually `main`, and the `/ (root)` folder.
6. Save the settings.
7. GitHub Pages will publish `index.html` as the site entrypoint.

## Local Preview

You can open `index.html` directly in a browser, or run a simple local server.
