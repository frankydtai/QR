# Overview

This is a QR Code Generator application built with React, TypeScript, and Node.js/Express. The application allows users to create custom QR codes by selecting different visual styles, uploading custom images, and entering URLs or social media profiles. The app features a multi-step workflow with a clean Material Design-inspired interface optimized for mobile devices.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **State Management**: React hooks for local component state, React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system and dark/light theme support
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints for QR code generation and health checks
- **Authentication**: Replit Auth integration with OpenID Connect for user management
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Error Handling**: Centralized error handling middleware with structured responses

## Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless database with connection pooling
- **Schema**: User management tables (required for Replit Auth) and session storage
- **Migrations**: Drizzle Kit for database schema management

## QR Code Generation
- **External Tool**: Uses Python's `amzqr` library via child process execution
- **Processing**: Generates QR codes with custom images, contrast, and brightness adjustments
- **File Handling**: Temporary file system storage for image processing and QR generation
- **Parameters**: Fixed version 10 and high error correction level for reliability

## Design System
- **Approach**: Material Design-inspired component library with consistent spacing and typography
- **Color Palette**: Comprehensive light/dark mode support with HSL color system
- **Typography**: Inter font family from Google Fonts with defined weight and size hierarchy
- **Layout**: Mobile-first responsive design with max-width containers and consistent spacing units

# External Dependencies

## Core Technologies
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Replit Auth**: OpenID Connect authentication service integrated with Replit platform
- **Python amzqr**: External QR code generation library for creating customized QR codes with images

## UI and Styling
- **Shadcn/ui**: Pre-built accessible component library based on Radix UI primitives  
- **Radix UI**: Headless component library providing accessibility and keyboard navigation
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Icon library for consistent iconography

## Development and Build Tools
- **Vite**: Fast build tool with hot module replacement for development
- **TypeScript**: Type safety and enhanced developer experience
- **Drizzle Kit**: Database toolkit for migrations and schema management
- **ESBuild**: Fast JavaScript bundler for production builds

## Runtime Libraries  
- **React Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant forms with easy validation integration
- **Zod**: TypeScript-first schema validation for API requests and forms
- **Express Session**: Session middleware with PostgreSQL persistence