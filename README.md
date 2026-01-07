# AI Backend for WMS Dashboard

An Express.js backend server that provides AI-powered analytics for a Warehouse Management System (WMS) Dashboard. Integrates with OpenRouter (DeepSeek AI) for natural language queries and Supabase for data persistence.

## Features

- **AI-Powered Analytics**: Natural language interface for querying dashboard data
- **Database Integration**: Supabase backend with pre-configured views
- **Smart Query Routing**: AI can analyze screen data or query database views when needed
- **CORS Enabled**: Ready for frontend integration

## Available Database Views

- `view_financial_dashboard` - Revenue, payments, outlets
- `view_operational_dashboard` - Therapist operations, duration, demographics
- `view_product_mix` - Transaction types, product quantities
- `view_peak_hours` - Transaction patterns by day and hour

## Prerequisites

- Node.js (v14 or higher)
- OpenRouter API key
- Supabase project with service role key

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```
PORT=3000
OPENROUTER_API_KEY=your_actual_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Usage

Start the server:
```bash
npm start
```

Or for development:
```bash
npm run dev
```

The server will start on port 3000 (or the port specified in your `.env`).

## API Endpoint

### POST /ask-ai

Submit questions to the AI assistant about your WMS data.

**Request Body:**
```json
{
  "message": "What's our total revenue this month?",
  "contextData": { ... }, // Current screen data
  "pageName": "financial_dashboard"
}
```

**Response:**
```json
{
  "reply": "Based on the data, your total revenue for this month is..."
}
```

## How It Works

1. User submits a question through the frontend
2. AI analyzes the question along with current screen context
3. If answer is in screen data, AI responds directly
4. If database query is needed, AI generates a structured query command
5. Backend executes Supabase query and returns results to AI
6. AI formulates natural language response from query results

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `OPENROUTER_API_KEY` | API key for OpenRouter/DeepSeek |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for admin access |

## Project Structure

```
aibackend/
├── server.js          # Main Express server
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Security Notes

- Never commit `.env` file to version control
- Service role key should only be used server-side
- CORS is enabled for all origins - restrict in production
# zen-ai-backend
