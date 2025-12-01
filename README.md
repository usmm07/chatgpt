# Diio multilingual site

Marketing site for Diio, a service that simplifies grocery checkout for small markets and roadside shops. The site is available
in Uzbek, Russian, and English with a simple Node backend to capture contact requests.

## Getting started

1. Install Node.js (no external packages required).
2. Start the server
   ```bash
   npm start
   ```
3. Open the site at http://localhost:3000. Language preference is auto-detected from your browser and remembered when you switch.

## Contact endpoint

The backend exposes `POST /api/contact` to store submissions in `data/contacts.json`. Fields:
- `name` (required)
- `email` (required)
- `phone`
- `message`

A `GET /api/health` route is also available for monitoring.

> Note: `data/contacts.json` is created automatically when the server starts and is ignored from version control so real contact data is not committed.
