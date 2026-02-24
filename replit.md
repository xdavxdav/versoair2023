# Business Intelligence Platform

## Overview

This is a full-stack business intelligence platform built with React/TypeScript on the frontend, Express.js on the backend, and PostgreSQL with Drizzle ORM for data management. The application provides analytics dashboards for various business sectors including commerce, hospitality, construction, automotive, finance, and entertainment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: React Query (TanStack Query) for server state management
- **UI Components**: Radix UI primitives with custom Tailwind CSS styling (shadcn/ui design system)
- **Build Tool**: Vite for development and bundling
- **Styling**: Tailwind CSS with CSS custom properties for theming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Connection Pool**: Neon serverless database connection
- **Session Management**: Express sessions (infrastructure prepared)

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Located in `/shared/schema.ts` for type sharing between frontend and backend
- **Migrations**: Managed through Drizzle Kit in `/migrations` directory

## Key Components

### Data Models
- **Users**: Authentication and user management (username, email, password, role)
- **Business Categories**: Categorization system for different business types
- **Businesses**: Business entities with category associations and owner relationships
- **Analytics**: Metrics storage with business and category associations
- **Reservations**: Booking system for service-based businesses

### Frontend Pages
- **Home**: Landing page with help section and business overview
- **Sector-specific dashboards**: Commerce, Hotellerie, Batiment, Automobile, Finances, Divertissement
- **Functional pages**: Reservations, Logement, SAV (Customer Service), VersoAI
- **Authentication**: Sign-in page with login/registration forms

### UI Components
- **Analytics Cards**: Reusable cards for displaying metrics with trend indicators
- **Charts**: Chart.js integration for data visualization
- **Navigation**: Responsive navbar with dropdown menus
- **Modals**: Music portal and location panel overlays
- **Form Components**: Complete form system with validation

## Data Flow

1. **Client requests** are routed through Wouter on the frontend
2. **API calls** use React Query for caching and state management
3. **Backend routes** in `/server/routes.ts` handle business logic
4. **Database operations** use Drizzle ORM with connection pooling
5. **Real-time updates** through React Query's automatic refetching
6. **Chart rendering** happens client-side with Chart.js after data fetching

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL hosting
- **Connection**: WebSocket-based connection for serverless environments

### UI Libraries
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon system
- **Chart.js**: Data visualization library loaded dynamically
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Build tool with HMR and optimized bundling
- **TypeScript**: Static type checking across the stack
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx for TypeScript execution with nodemon-like behavior
- **Database**: Drizzle migrations applied automatically

### Production Build
- **Frontend**: Static files built to `/dist/public`
- **Backend**: ESBuild bundles server code to `/dist/index.js`
- **Environment**: Node.js production server serving both API and static files
- **Database**: Connection pooling optimized for serverless deployment

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment detection for development features
- **Session management**: Prepared for production session store integration

The application follows a monorepo structure with clear separation between client, server, and shared code, making it maintainable and scalable for business intelligence use cases.