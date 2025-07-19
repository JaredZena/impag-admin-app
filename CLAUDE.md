# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IMPAG Simple Quotation App** - A React-based web application that allows users to generate quotations by querying an AI API. This is the simplified version focused on hot reload development.

## Development Commands

- `npm run dev` - Start development server with Vite and enhanced hot reload (uses --force flag)
- `npm run build` - TypeScript compilation and production build  
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code linting

## Hot Reload Configuration

This branch is specifically configured for optimal hot reload development:

**Vite Hot Reload Features:**
- `--force` flag in dev script for aggressive cache clearing
- `hmr.overlay: true` for error overlay display
- `watch.usePolling: true` for better file change detection
- `optimizeDeps.force: true` for dependency optimization
- `sourcemap: true` for debugging

**Development Proxy:**
- API requests to `/api` are proxied to `https://democratic-cuckoo-impag-f0717e14.koyeb.app`

## Architecture Overview

**Tech Stack:**
- React 19 + TypeScript
- Vite (build tool with enhanced hot reload)
- Tailwind CSS + shadcn/ui components
- React Markdown for response rendering

**App Structure:**
- Single-page query interface
- API integration for quotation generation
- Responsive design with mobile support
- Copy-to-clipboard functionality

## Code Conventions

- TypeScript strict mode enabled
- React functional components with hooks
- Tailwind CSS for styling
- shadcn/ui component library
- API proxy pattern for development

## Testing Hot Reload

To test hot reload functionality:
1. Run `npm run dev`
2. Edit any React component or style
3. Changes should appear instantly without page refresh
4. Check browser console for HMR status