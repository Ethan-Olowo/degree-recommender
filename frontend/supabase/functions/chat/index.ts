import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recOutput, chatHistory, newMessage } = await req.json();
    console.log('Chat request received:', { recOutput, chatHistoryLength: chatHistory?.length, newMessage });

    const openRouterApiKey = Deno.env.get('openRouterApiKey');
    if (!openRouterApiKey) {
      throw new Error('openRouterApiKey is not configured');
    }

    // Build system prompt with recommendations context
    let systemPrompt = `You are a helpful AI assistant that helps students understand their degree recommendations and academic journey. You provide clear, concise, and supportive guidance.`;
    
    if (recOutput && recOutput.length > 0) {
      systemPrompt += `\n\nThe student has the following degree recommendations:\n`;
      recOutput.forEach((rec: any, idx: number) => {
        systemPrompt += `${idx + 1}. ${rec.degree_programs?.program_name} (${rec.degree_programs?.program_type})\n`;
        systemPrompt += `   - Confidence Score: ${rec.confidence_score}/100\n`;
        systemPrompt += `   - Market Score: ${rec.market_score}/100\n`;
        if (rec.explanation) {
          systemPrompt += `   - Why: ${rec.explanation}\n`;
        }
        if (rec.degree_programs?.description) {
          systemPrompt += `   - Description: ${rec.degree_programs.description}\n`;
        }
      });
    }

    systemPrompt += `\n\nAnswer questions about these recommendations, help the student understand their options, and provide guidance on their academic path. Keep responses friendly, clear, and under 200 words unless more detail is specifically requested.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []),
      { role: 'user', content: newMessage }
    ];

    console.log('Calling OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response received');
    
    const reply = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        reply: 'I apologize, but I encountered an error. Please try again.'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
