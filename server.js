require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/ask-ai', limiter);

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'OPENROUTER_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Initialize Supabase Client with error handling
let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Supabase client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (_req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      supabase: !!supabase,
      openrouter: !!process.env.OPENROUTER_API_KEY
    }
  };
  res.status(200).json(healthcheck);
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'Zen AI Backend',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      askAI: 'POST /ask-ai'
    }
  });
});

// Main AI endpoint
app.post('/ask-ai', async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  console.log(`[${requestId}] Received AI request`);

  try {
    const { message, contextData, pageName } = req.body;

    // Input validation
    if (!message || typeof message !== 'string') {
      console.warn(`[${requestId}] Invalid message input`);
      return res.status(400).json({
        error: 'Invalid input: message is required and must be a string'
      });
    }

    if (message.length > 5000) {
      console.warn(`[${requestId}] Message too long: ${message.length} chars`);
      return res.status(400).json({
        error: 'Message too long. Maximum 5000 characters allowed.'
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // 1. Get Current Date for the AI
    const today = new Date().toISOString().split('T')[0];

    const dbSchema = `
    AVAILABLE VIEWS:
    - view_financial_dashboard (net_revenue, payment_via, bank_1, amount_1, kode_outlet, nama_outlet...)
    - view_operational_dashboard (therapist_id, duration_minutes, is_by_request, gender, service_category...)
    - view_product_mix (trans_type_id, produk_jasa_nama, quantity, total_revenue...)
    - view_peak_hours (day_name, hour_block, transaction_value)
    `;

    const systemPrompt = `
      You are an expert Spa and Reflexology Data Analyst analyzing "${pageName || 'dashboard'}".
      Current Date: ${today}.
      Current Screen Data: ${JSON.stringify(contextData).slice(0, 1500)}...

      RULES:
      1. If the answer is in "Current Screen Data", answer directly in Markdown.
      2. If you need more data (e.g., past history, specific items), Query the Database.
      3. TO QUERY: Return ONLY a JSON object. Do not add text like "Here is the query".
      4. DATE FORMAT: Always use YYYY-MM-DD. Calculate "yesterday" relative to ${today}.

      JSON FORMAT FOR QUERYING:
      {
        "action": "QUERY_DB",
        "view": "view_name_here",
        "filters": { "column": "val", "date_start": "YYYY-MM-DD", "date_end": "YYYY-MM-DD" }
      }

      Database Schema: ${dbSchema}
    `;

    // --- ROUND 1: Ask AI ---
    console.log(`[${requestId}] Calling OpenRouter API...`);
    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.1,
        max_tokens: 2000 // Prevent excessive token usage
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.SITE_URL || "https://your-site.com",
          "X-Title": "WMS Dashboard"
        },
        timeout: 30000 // 30 second timeout
      }
    );

    let reply = aiResponse.data.choices[0].message.content;
    console.log(`[${requestId}] Received AI response, length: ${reply.length} chars`);

    // --- CHECK FOR TOOL CALL ---
    const cleanJson = reply.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const tool = JSON.parse(cleanJson);

      if (tool.action === 'QUERY_DB') {
        console.log(`[${requestId}] AI requesting DB query:`, tool);

        // Validate view name to prevent SQL injection
        const validViews = [
          'view_financial_dashboard',
          'view_operational_dashboard',
          'view_product_mix',
          'view_peak_hours'
        ];

        if (!validViews.includes(tool.view)) {
          console.error(`[${requestId}] Invalid view name: ${tool.view}`);
          return res.status(400).json({
            error: 'Invalid database view requested'
          });
        }

        // Build query with filters
        let query = supabase.from(tool.view).select('*').limit(50);

        if (tool.filters?.date_start) {
          query = query.gte('tanggal', tool.filters.date_start);
        }
        if (tool.filters?.date_end) {
          query = query.lte('tanggal', tool.filters.date_end);
        }

        const { data: dbResult, error } = await query;

        if (error) {
          console.error(`[${requestId}] Database error:`, error);
          throw error;
        }

        console.log(`[${requestId}] DB query returned ${dbResult?.length || 0} rows`);

        // Follow up with AI
        const followUp = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "deepseek/deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
              { role: "assistant", content: JSON.stringify(tool) },
              { role: "system", content: `DB RESULT: ${JSON.stringify(dbResult)}` }
            ],
            temperature: 0.1,
            max_tokens: 2000
          },
          {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.SITE_URL || "https://your-site.com",
              "X-Title": "WMS Dashboard"
            },
            timeout: 30000
          }
        );

        reply = followUp.data.choices[0].message.content;
      }
    } catch (parseError) {
      // Not a valid JSON, treat as normal response
      console.log(`[${requestId}] Response is direct text, not a tool call`);
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Request completed in ${duration}ms`);

    res.json({ reply });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      console.error(`[${requestId}] Request timeout after ${duration}ms`);
      return res.status(504).json({
        error: 'Request timeout. The AI service took too long to respond.'
      });
    }

    if (error.response?.status === 429) {
      console.error(`[${requestId}] Rate limited by OpenRouter`);
      return res.status(429).json({
        error: 'Too many requests to AI service. Please try again later.'
      });
    }

    if (error.response?.status === 401) {
      console.error(`[${requestId}] Invalid API key`);
      return res.status(500).json({
        error: 'AI service authentication failed. Check API key.'
      });
    }

    // Generic error handler
    console.error(`[${requestId}] Error after ${duration}ms:`, error.message);
    console.error(error.stack);

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server running on port', process.env.PORT || 3000);
  console.log('📊 Health check: http://localhost:' + (process.env.PORT || 3000) + '/health');
  console.log('🤖 AI Endpoint: POST http://localhost:' + (process.env.PORT || 3000) + '/ask-ai');
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
});

// Handle shutdown signals
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  Received ${signal}, closing server gracefully...`);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});
