# Project Code Style Guide

This project adopts a front-end and back-end separation architecture. The front-end uses HTML/CSS/Vanilla JS, and the back-end uses Vercel Serverless (Node.js). To ensure code readability and collaboration efficiency, the following guidelines are established.

## 1. General JavaScript Guidelines
- **Naming**: Use camelCase for variables and functions (e.g., `calculateResult`). Use UPPER_SNAKE_CASE for constants (e.g., `MAX_RETRY_COUNT`).
- **Indentation & Formatting**: Use 2 spaces for indentation. Always terminate statements with a semicolon. Prefer single quotes `'` for strings.
- **Semicolons**: Do not rely on Automatic Semicolon Insertion (ASI). Always add semicolons explicitly.
- **Comments**: Complex logic blocks must be preceded by single-line (`//`) or block (`/* */`) comments explaining the intent.
- **Strict Mode**: Front-end JavaScript must be wrapped in an Immediately Invoked Function Expression (IIFE) and use `'use strict';`.

## 2. Front-End Specific Guidelines (HTML/CSS)
- **HTML**:
  - Use double quotes `"` for attribute values.
  - Use `data-key` format for custom attributes to facilitate event delegation.
- **CSS**:
  - Use kebab-case for class names (e.g., `.history-list`).
  - Avoid inline styles; place all styles in `<style>` tags or external CSS files.
  - Use CSS variables for colors, spacing, etc., for unified management (optional).
- **Event Binding**: Use event delegation (`addEventListener`) to bind dynamic elements. Avoid binding events to each button individually.

## 3. Back-End Specific Guidelines (Node.js / Vercel Serverless)
- **API Response Format**:
  - Always return JSON format containing a `success` boolean.
  - On success, include a `data` or `result` field. On failure, include an `error` string field.
- **Error Handling**:
  - All API logic must be wrapped in `try...catch` to prevent server crashes.
  - Use `console.error` to log server-side errors. Error messages returned to the front-end should be user-friendly and easy to understand.
- **Environment Variables**:
  - Sensitive information (such as Supabase URL and Key) must be read via `process.env`. Hardcoding is strictly prohibited.
- **Request Body Parsing**: Be compatible with the Vercel Serverless environment. Manually parse `req.body` to support both `string` and `Buffer` formats.

## 4. File and Directory Structure
- `index.html`: Front-end main page (including CSS and JS).
- `api/calculate.js`: Back-end Serverless function.
- `package.json`: Project dependency declarations.
- Do not commit `node_modules` and `.vercel` directories to Git.
