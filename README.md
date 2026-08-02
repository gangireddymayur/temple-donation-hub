# Temple Donation Signage Hub (Server & Console)

An interactive web-based dashboard and backend server to manage digital signage and devotee donations ("Daan") for temples.

## Features

- **Devotee Donation Kiosk Widget**: Create customizable donation panels with preset buttons (e.g. ₹101 Kalyanotsavam, ₹501 Anna Prasadam) and layouts.
- **Direct UPI & Razorpay Payment Integrations**: Dynamic UPI QR code generation (zero transaction fees) or standard Razorpay merchant order gateway support.
- **Real-Time Transaction Log & Analytics**: View and monitor donation metrics (total daan, success rate, campaign counts) and search devotee offerings in real-time.
- **Digital Signage Management**: Pair screen devices, assign layouts, manage media files (images/videos), and schedule playlists.
- **Automatic Startup Migrations**: Automatically constructs and updates database schemas on MariaDB/MySQL (production) and SQLite (local testing).

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Radix UI, Lucide Icons, Shadcn UI
- **Backend**: Node.js, Express, MySQL/MariaDB (prod) & SQLite (dev)
- **Real-Time Updates**: Status polling & webhook verified handlers

## Development Setup

1. Copy `.env.example` to `.env` and fill in local/Plesk connection credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs Vite for frontend and Express for backend):
   - Frontend: `npm run dev`
   - Backend: `cd backend && npm run dev`

## Production Deployment (Plesk)

1. Package the Vite application locally:
   ```bash
   npm run build
   ```
2. Upload `package.json`, `dist/` directory, and `backend/` directory to the Plesk domain folder.
3. Configure the startup file to `backend/server.js` in the Plesk Node.js extension and set environment variables.
