# Dog Kennel Booking System

## Overview

This project, "The Howliday Inn," is a full-stack web application designed for managing dog daycare and boarding services. It provides an online booking system for customers and an administrative dashboard for business operations. The system aims to offer a seamless booking experience, efficient management tools, and support business growth through features like breed restrictions, various service types, capacity management, and a comprehensive trial day enforcement system for new dogs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **UI/UX**: Radix UI primitives, shadcn/ui components, Tailwind CSS for styling.
- **State Management**: React Query for server state.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite.
- **Mobile Optimization**: Responsive images, explicit image dimensions, DNS prefetch/preconnect.

### Backend
- **Framework**: Express.js with TypeScript.
- **API Design**: RESTful for booking and customer management.
- **Validation**: Zod schemas shared with frontend.
- **Error Handling**: Centralized middleware with structured responses.
- **Service Types**: Supports "daycare", "boarding:small", "boarding:large", and "trial".
- **Operating Hours Policy**: Day-specific operating windows with frontend and backend validation for bookings.
- **Pricing System**: Feature-flagged system supporting both hours-based (v1) and calendar-based (v2) pricing models, controlled by `PRICING_MODEL` environment variable. Server-side authoritative price calculation.
- **Trial Day Gating**: Server-side enforcement ensuring all new dogs complete a paid Trial Day before accessing daycare or boarding services, including cooldown periods and admin override.

### Data Storage
- **Database**: PostgreSQL (Neon serverless for production).
- **ORM**: Drizzle ORM for type-safe operations and migrations.
- **Development Storage**: In-memory storage for rapid development.

### Authentication and Authorization
- **Authentication**: Firebase Authentication for client-side user management.
- **User Management**: Automatic PostgreSQL user creation on first login.
- **Token Validation**: Server uses Firebase public certificates.
- **Authorization**: Role-based access control.

### Deployment
- **Architecture**: Replit-only deployment; single server serves both frontend and backend.
- **Development Mode**: Vite dev server with HMR.
- **Production Mode**: Express serves built static files with SPA fallback.
- **Custom Domain**: Configured for `www.thehowlidayinn.ie`.
- **Cookies**: JWT-based session cookies (7-day expiry), HttpOnly, Secure, SameSite=Lax.
- **CORS**: Not needed due to same-origin deployment.
- **HTTPS**: Automatic redirect to HTTPS.

### System Design Choices
- **Stripe Integration**: Utilizes server-side Stripe Checkout Sessions for payments with hard redirects, ensuring server-side price validation and security.
- **Error Handling & Diagnostics**: Global error handlers and unhandled rejection listeners for improved client-side error visibility, automatic service worker cleanup, and API error logging.

## External Dependencies

- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe database toolkit.
- **React Ecosystem**: React 18, TypeScript, React Query.
- **UI Framework**: Radix UI, shadcn/ui, Tailwind CSS.
- **Form Management**: React Hook Form, Zod.
- **Routing**: Wouter.
- **Date Handling**: date-fns.
- **HTTP Client**: Axios.
- **Firebase Authentication**: For user authentication.
- **Cloudinary**: For image optimization and delivery.
- **Stripe**: For payment processing (server-side Checkout Sessions).