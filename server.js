// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(cors()); // Allow frontend to talk to this
app.use(express.json());

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/ask-ai', async (req, res) => {
  try {
    const { message, contextData, pageName } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Server Missing API Key' });

    // 1. Define Schema
    const dbSchema = `
    AVAILABLE VIEWS:
    - view_financial_dashboard (net_revenue, payment_via, bank_1, amount_1, kode_outlet, nama_outlet...)
    - view_operational_dashboard (therapist_id, duration_minutes, is_by_request, gender...)
    - view_product_mix (trans_type_id, produk_jasa_nama, quantity...)
    - view_peak_hours (day_name, hour_block, transaction_value)
    `;

    // 2. System Prompt
    const systemPrompt = `
      You are an expert Data Analyst for a Spa Business "${pageName}".
      Current Screen Data: ${JSON.stringify(contextData).slice(0, 1500)}...
      
      If the user asks a question NOT in the screen data, you can Query the Database.
      To query, return ONLY JSON: 
      { "action": "QUERY_DB", "view": "view_name", "filters": { "column": "val", "date_start": "YYYY-MM-DD" } }
      
      Database Schema: ${dbSchema}
    `;

    // 3. Call DeepSeek (OpenRouter)
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
        "X-Title": "WMS Dashboard"
      }
    });

    let reply = aiResponse.data.choices[0].message.content;

    // 4. Handle DB Query Logic
    try {
      const tool = JSON.parse(reply);
      if (tool.action === 'QUERY_DB') {
        let query = supabase.from(tool.view).select('*').limit(20);
        
        if (tool.filters?.date_start) query = query.gte('tanggal', tool.filters.date_start);
        if (tool.filters?.date_end) query = query.lte('tanggal', tool.filters.date_end);
        
        const { data: dbResult, error } = await query;
        if(error) throw error;

        // Follow up with AI
        const followUp = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
          model: "deepseek/deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
            { role: "assistant", content: JSON.stringify(tool) },
            { role: "system", content: `DB RESULT: ${JSON.stringify(dbResult)}` }
          ]
        }, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        
        reply = followUp.data.choices[0].message.content;
      }
    } catch (e) {
      // Not JSON, ignore
    }

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI Server running on port ${PORT}`));