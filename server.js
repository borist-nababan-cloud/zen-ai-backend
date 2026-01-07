require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/ask-ai', async (req, res) => {
  try {
    const { message, contextData, pageName } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Server Missing API Key' });

    // 1. Get Current Date for the AI (so it knows what "Yesterday" is)
    const today = new Date().toISOString().split('T')[0];

    const dbSchema = `
    AVAILABLE VIEWS:
    - view_financial_dashboard (net_revenue, payment_via, bank_1, amount_1, kode_outlet, nama_outlet...)
    - view_operational_dashboard (therapist_id, duration_minutes, is_by_request, gender, service_category...)
    - view_product_mix (trans_type_id, produk_jasa_nama, quantity, total_revenue...)
    - view_peak_hours (day_name, hour_block, transaction_value)
    `;

    const systemPrompt = `
      You are an expert Spa and Reflexology Data Analyst analyzing "${pageName}".
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
    const aiResponse = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "deepseek/deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.1
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-site.com", // Required by OpenRouter
        "X-Title": "WMS Dashboard"
      }
    });

    let reply = aiResponse.data.choices[0].message.content;

    // --- CHECK FOR TOOL CALL ---
    // DeepSeek might wrap JSON in markdown blocks. Clean it.
    const cleanJson = reply.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      // Try to parse the response as JSON
      const tool = JSON.parse(cleanJson);

      if (tool.action === 'QUERY_DB') {
        console.log("AI requesting DB access:", tool);

        // 1. Build Query
        let query = supabase.from(tool.view).select('*').limit(50); // Limit to prevent overflow