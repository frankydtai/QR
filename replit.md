# QR Code Generator

A full-stack QR code generator application that uses WebAssembly (WASM) for high-performance QR code generation.

## Overview

This is a React-based QR code generator with a multi-step wizard interface that allows users to:
1. Select a QR code style (Classic, Rounded, Logo Center, Gradient)
2. Upload a logo image (optional)
3. Enter a URL
4. Generate and download/share the QR code

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with shadcn/ui components
- **Routing**: Wouter
- **State Management**: TanStack Query

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Build**: tsx for development, esbuild for production

### QR Code Generation
- **Engine**: Go WebAssembly module (goqr.wasm)
- **Location**: `client/public/goqr.wasm` and `client/public/wasm_exec.js`
- **Integration**: Global `generateQRCode` function loaded at page load

## Project Structure

```
├── client/               # Frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities
│   │   └── hooks/       # Custom React hooks
│   ├── public/          # Static assets (WASM files)
│   └── index.html       # Entry HTML
├── server/              # Backend application
│   ├── index.ts         # Express server
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Storage interface
│   └── vite.ts          # Vite integration
├── shared/              # Shared types
│   └── schema.ts        # Data models
└── attached_assets/     # User-uploaded assets
```

## Development

The project runs on port 5000 (required for Replit environment).

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
```

## Recent Changes

- **2025-09-30**: Initial project setup
  - Configured Vite to serve WASM files from client/public directory
  - Added WASM loader script to index.html
  - Updated QRGenerator component to use WASM `generateQRCode` function
  - Configured deployment for Replit autoscale

## Technical Details

### WASM Integration

The WASM module is loaded on page load via the `wasm_exec.js` script and exposes a global `generateQRCode` function:

```javascript
generateQRCode(content, options)
generateQart(content, options)
```

**Parameters:**
- `content`: The URL or text to encode in the QR code
- `options`: Optional configuration object
  - `logoImage`: Base64 encoded image data (without data URI prefix)

**Returns:**
- Object with `image` field containing base64 encoded PNG data
- Or `error` field if generation failed

### Host Configuration

The Vite dev server is configured with `allowedHosts: true` to support Replit's proxy environment, ensuring the frontend is accessible through Replit's iframe preview.

## Deployment

The project is configured for Replit Autoscale deployment:
- Build command: `npm run build`
- Run command: `npm run start`
- Port: 5000 (mapped to external port 80)
