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

// Helper function: Extract JSON from mixed content
function extractJSONFromText(text) {
  // Try to find JSON object in the text
  const jsonPattern = /\{[^{}]*"action"[^{}]*\}/;
  const match = text.match(jsonPattern);

  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (e) {
      // If parsing fails, try more aggressive extraction
      const openBrace = text.indexOf('{');
      const closeBrace = text.lastIndexOf('}');
      if (openBrace !== -1 && closeBrace !== -1 && closeBrace > openBrace) {
        try {
          return JSON.parse(text.substring(openBrace, closeBrace + 1));
        } catch (e2) {
          // Return null if all parsing attempts fail
          return null;
        }
      }
    }
  }

  // Try parsing the entire cleaned text as fallback
  const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch (e) {
    return null;
  }
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

      CRITICAL RULES:
      1. If the answer is in "Current Screen Data", respond directly in friendly, conversational Markdown format.
      2. If you need more data (past history, specific items), you MUST Query the Database.
      3. TO QUERY DATABASE: Return ONLY a raw JSON object. NO markdown, NO text before/after, NO explanation.
      4. DATE FORMAT: Always use YYYY-MM-DD. Calculate "yesterday" relative to ${today}.

      JSON FORMAT FOR QUERYING (return this EXACT format, nothing else):
      {"action":"QUERY_DB","view":"view_name","filters":{"date_start":"YYYY-MM-DD","date_end":"YYYY-MM-DD"}}

      AFTER RECEIVING DATABASE RESULTS: Analyze the data and provide a clear, friendly, conversational response in Markdown. DO NOT return JSON.

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

    let reply = aiResponse.data.choices[0].message.content;
    console.log(`[${requestId}] Received AI response, length: ${reply.length} chars`);
    console.log(`[${requestId}] Response preview: ${reply.substring(0, 200)}...`);

    // --- CHECK FOR TOOL CALL ---
    const toolCall = extractJSONFromText(reply);

    if (toolCall && toolCall.action === 'QUERY_DB') {
      console.log(`[${requestId}] AI requesting DB query:`, toolCall);

      // Validate view name to prevent SQL injection
      const validViews = [
        'view_financial_dashboard',
        'view_operational_dashboard',
        'view_product_mix',
        'view_peak_hours'
      ];

      if (!validViews.includes(toolCall.view)) {
        console.error(`[${requestId}] Invalid view name: ${toolCall.view}`);
        return res.status(400).json({
          error: 'Invalid database view requested'
        });
      }

      // Build query with filters
      let query = supabase.from(toolCall.view).select('*').limit(50);

      if (toolCall.filters?.date_start) {
        query = query.gte('tanggal', toolCall.filters.date_start);
      }
      if (toolCall.filters?.date_end) {
        query = query.lte('tanggal', toolCall.filters.date_end);
      }

      const { data: dbResult, error } = await query;

      if (error) {
        console.error(`[${requestId}] Database error:`, error);
        throw error;
      }

      console.log(`[${requestId}] DB query returned ${dbResult?.length || 0} rows`);

      // Follow up with AI - EXPLICITLY request natural language response
      const followUpPrompt = `
        You previously received a database query result. Based on this data, provide a clear, friendly, conversational answer to the user's question: "${message}"

        Database Results: ${JSON.stringify(dbResult)}

        IMPORTANT:
        - Respond in natural, conversational Markdown format
        - DO NOT return JSON
        - DO NOT include technical details
        - Be helpful and friendly
        - Use formatting (bullet points, tables) where appropriate
      `;

      const followUp = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "deepseek/deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
            { role: "assistant", content: JSON.stringify(toolCall) },
            { role: "user", content: followUpPrompt }
          ],
          temperature: 0.3, // Slightly higher for more natural responses
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
      console.log(`[${requestId}] Final AI response received, length: ${reply.length} chars`);

      // Final safety check: if response still contains JSON, try to clean it
      const finalCheck = extractJSONFromText(reply);
      if (finalCheck && finalCheck.action === 'QUERY_DB') {
        console.warn(`[${requestId}] WARNING: AI returned another query request. Converting to error message.`);
        reply = "I apologize, but I'm having trouble processing your request. The system attempted to query the database multiple times. Please try rephrasing your question or contact support.";
      }
    } else {
      console.log(`[${requestId}] Direct response (no DB query needed)`);
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
