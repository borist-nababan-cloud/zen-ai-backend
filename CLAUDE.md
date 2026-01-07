# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered backend for a Warehouse Management System (WMS) Dashboard. It provides a natural language interface for querying WMS data using DeepSeek AI via OpenRouter, with Supabase as the database backend.

## Development Commands

### Running the Server
```bash
npm start          # Start production server
npm run dev        # Start development server (same as start)
```

### Installation
```bash
npm install        # Install dependencies
```

## Architecture

### Core Components

**Single-File Architecture (server.js)**
- **Express Server**: Main HTTP server with CORS enabled
- **Supabase Client**: Admin client with service role key for full database access
- **AI Integration**: DeepSeek AI via OpenRouter API for natural language processing
- **Query Router**: Intelligently routes questions between screen data analysis and database queries

### Request Flow

1. **Incoming Request**: POST to `/ask-ai` with `{ message, contextData, pageName }`
2. **AI Analysis**: DeepSeek analyzes the question against current screen context
3. **Smart Routing**:
   - If answer exists in screen data → AI responds directly
   - If database query needed → AI returns structured JSON command
4. **Query Execution**: Backend executes Supabase query (views only, max 20 rows)
5. **Response Generation**: AI formulates natural language response from query results

### Database Views

The system queries pre-configured Supabase views:
- `view_financial_dashboard` - Revenue, payment methods, outlet data
- `view_operational_dashboard` - Therapist operations, duration, demographics
- `view_product_mix` - Transaction types, product quantities
- `view_peak_hours` - Transaction patterns by day and hour

### AI Prompt Structure

**System Prompt Pattern** (server.js:35-44):
```
- Page context and screen data (truncated to 1500 chars)
- Database schema definition
- Query instruction: Return JSON for DB queries
- Format: { "action": "QUERY_DB", "view": "view_name", "filters": {...} }
```

**Query Filters** (server.js:70-71):
- `date_start` / `date_end` for date ranges
- Applied via Supabase's `.gte()` and `.lte()` methods
- Limited to 20 results per query

## Environment Setup

Required environment variables in `.env`:
- `PORT` - Server port (default: 3000)
- `OPENROUTER_API_KEY` - OpenRouter API key for DeepSeek
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)

Copy `.env.example` to `.env` and configure before running.

## Key Technical Details

### Error Handling
- Try-catch around AI response parsing (server.js:65-93)
- Non-JSON responses treated as direct answers
- Database errors thrown and caught by outer error handler

### AI Configuration
- Model: `deepseek/deepseek-chat`
- Temperature: 0.1 (low for consistency)
- API: OpenRouter (https://openrouter.ai/api/v1/chat/completions)

### Supabase Usage
- Service role client (bypasses RLS)
- View-based queries (`.select('*')`)
- Dynamic filter application
- Result limit: 20 rows

## Important Constraints

- **CORS is currently open** - restrict origins in production
- **Service role key** - never expose to frontend
- **No test suite** - tests need to be added
- **Single file architecture** - all logic in server.js
- **View-only queries** - cannot modify data through this API
