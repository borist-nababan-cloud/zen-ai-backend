# AI Backend for WMS Dashboard

A production-ready Express.js backend server that provides AI-powered analytics for a Spa and Reflexology Management System. Integrates with OpenRouter (DeepSeek AI) for natural language queries and Supabase for data persistence.

## Features

- **AI-Powered Analytics**: Natural language interface for querying dashboard data
- **Database Integration**: Supabase backend with pre-configured views
- **Smart Query Routing**: AI can analyze screen data or query database views when needed
- **Production-Ready Security**: Helmet.js security headers, rate limiting, input validation
- **Health Monitoring**: Built-in health check endpoint for monitoring
- **Graceful Shutdown**: Proper handling of SIGTERM/SIGINT signals
- **Request Logging**: Detailed logging with request IDs for debugging
- **Error Handling**: Comprehensive error handling with specific status codes

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
```env
PORT=3000
NODE_ENV=development
OPENROUTER_API_KEY=your_actual_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ALLOWED_ORIGINS=*
SITE_URL=https://your-site.com
```

## Usage

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on port 3000 (or the port specified in your `.env`).

## API Endpoints

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1234567890,
  "environment": "development",
  "checks": {
    "supabase": true,
    "openrouter": true
  }
}
```

### GET /

Root endpoint with service information.

**Response:**
```json
{
  "service": "Zen AI Backend",
  "version": "1.0.0",
  "status": "operational",
  "endpoints": {
    "health": "/health",
    "askAI": "POST /ask-ai"
  }
}
```

### POST /ask-ai

Submit questions to the AI assistant about your WMS data.

**Request Body:**
```json
{
  "message": "What's our total revenue this month?",
  "contextData": { ... },
  "pageName": "financial_dashboard"
}
```

**Response:**
```json
{
  "reply": "Based on the data, your total revenue for this month is..."
}
```

**Rate Limiting:** 100 requests per 15 minutes per IP

**Request Limits:**
- Message: Maximum 5000 characters
- Body size: Maximum 10MB

## Security Features

- **Helmet.js**: Security headers for HTTP responses
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Validates all inputs before processing
- **SQL Injection Prevention**: Whitelist-based database view validation
- **CORS Configuration**: Configurable origin restrictions
- **Environment Variable Validation**: Checks for required variables on startup

## Error Handling

The server provides specific error responses:

- `400` - Bad Request (invalid input, message too long)
- `404` - Not Found (invalid endpoint)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `504` - Gateway Timeout (AI service timeout)

All errors include:
- Error message
- Request ID (for tracking)
- Stack trace (in development mode only)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Required |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | * |
| `SITE_URL` | Your site URL for OpenRouter | https://your-site.com |

## How It Works

1. User submits a question through the frontend
2. AI analyzes the question along with current screen context
3. If answer is in screen data, AI responds directly
4. If database query is needed, AI generates a structured query command
5. Backend validates the query and executes Supabase query
6. Backend returns results to AI for natural language formulation
7. AI responds with user-friendly insights

## Monitoring

The server includes comprehensive logging:

- Request timestamp and method
- Request ID for tracking
- Response time
- Error details with stack traces
- Database query results

**Example log output:**
```
[2025-01-08T12:00:00.000Z] POST /ask-ai
[abc123] Received AI request
[abc123] Calling OpenRouter API...
[abc123] Received AI response, length: 245 chars
[abc123] Request completed in 1234ms
```

## Production Deployment

### Environment Setup

Set `NODE_ENV=production` for production:
- Disables detailed error messages
- Enables all security features
- Optimizes performance

### Security Checklist

- [ ] Set strong `ALLOWED_ORIGINS` (don't use `*`)
- [ ] Use HTTPS in production
- [ ] Set up proper API key rotation
- [ ] Configure rate limiting appropriately
- [ ] Enable request logging monitoring
- [ ] Set up health check alerts
- [ ] Use process manager (PM2, systemd)

### Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
docker build -t zen-ai-backend .
docker run -p 3000:3000 --env-file .env zen-ai-backend
```

## Graceful Shutdown

The server handles shutdown signals gracefully:
- Closes existing connections
- Rejects new requests
- Logs shutdown status
- Exits cleanly after 10 seconds

## Project Structure

```
aibackend/
├── server.js          # Main Express server (357 lines)
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
├── .gitignore         # Git ignore rules
├── Dockerfile         # Docker configuration
├── README.md          # This file
└── CLAUDE.md          # Claude AI context
```

## Performance

- **Request timeout**: 30 seconds (AI API calls)
- **Rate limit**: 100 requests per 15 minutes per IP
- **Max token limit**: 2000 tokens per AI response
- **Database query limit**: 50 rows per query
- **Body size limit**: 10MB

## Troubleshooting

### Server won't start
- Check all required environment variables are set
- Verify port 3000 is available
- Check `node_modules` are installed (`npm install`)

### AI requests failing
- Verify OpenRouter API key is valid
- Check API quota/billing
- Review error logs for specific error codes

### Database queries failing
- Verify Supabase credentials
- Check views exist in Supabase
- Review database permissions

## License

ISC

## Support

For issues and questions, please open an issue in the GitHub repository.
