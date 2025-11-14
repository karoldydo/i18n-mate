# Tech Stack

## Frontend

- **Vite** - Fast build tool with HMR for optimal development experience
- **React 19** - UI library for building interactive components and managing application state
- **TypeScript 5** - Static typing for better code quality and IDE support
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **Shadcn/ui** - Accessible React component library built on Radix UI with custom shared components (PageHeader, EmptyState, CardList)
- **React Router v7** - Client-side routing for SPA navigation
- **TanStack Query** - Server state management with caching and synchronization

## Backend

- **Supabase** - PostgreSQL database with built-in authentication, RLS policies, and realtime subscriptions
- **Supabase Edge Functions** - Serverless functions for custom API logic when needed
  - **Health Check Function** - Health check endpoint that executes database queries to ensure service continuity and verify Supabase availability
  - **Signup Function** - Custom registration with Resend API integration for email verification
- **Resend API** - Email delivery service for verification emails (integrated in signup Edge Function)

## Testing & Quality

- **Vitest** - Unit testing framework for JavaScript and TypeScript with Vite-native DX
- **@vitest/coverage-v8** - Coverage reports powered by the V8 engine
- **Testing Library** - User-focused testing utilities for React components
- **Playwright** - End-to-end testing framework for complete user workflow automation

## AI

- **OpenRouter.ai** - Gateway to multiple LLM providers (OpenAI, Anthropic, Google) with unified API

## CI/CD and Hosting

- **GitHub Actions** - CI/CD pipeline automation for testing and deployment
  - **Health Check Workflow** - Daily scheduled workflow to verify Supabase production and E2E environments are operational, ensuring service continuity and availability
- **Cloudflare Pages** - Production hosting with global CDN, manual deployments, and edge computing capabilities
- **Docker + DigitalOcean** - Pre-production environment for testing deployment scripts and production-ready pipelines

## Developer Experience

- **ESLint 9 + TypeScript ESLint** - Opinionated linting with React, accessibility, and unused-import guards
- **Prettier (Tailwind & JSON plugins)** - Consistent code formatting tailored for Tailwind utility ordering
- **Husky + lint-staged** - Git hooks that enforce linting and formatting on staged files
