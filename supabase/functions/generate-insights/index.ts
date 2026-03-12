import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, emotions, sentiment, crisisLevel, messages } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

    const isChat = messages && messages.length > 0;

    const systemPrompt = isChat
      ? `You are an AI analyzing public sentiment data. 
Topic: ${topic?.title || 'General sentiment analysis'}
Hashtag: ${topic?.hashtag || 'N/A'}
Overall Sentiment: ${sentiment || 'mixed'}
Crisis Level: ${crisisLevel || 'none'}
Top Emotions: ${emotions?.map((e: any) => `${e.emotion}: ${e.percentage}%`).join(', ') || 'Not analyzed'}

Answer the user's questions in an extremely concise manner. Provide ONLY the direct answer to what is exactly asked. Do not add any polishing, pleasantries, formatting flair, or extra information. Just direct, raw answers.`
      : `You are a senior PR and communications strategist. Analyze the following public sentiment data and provide balanced, actionable recommendations.

Topic: ${topic?.title || 'General sentiment analysis'}
Hashtag: ${topic?.hashtag || 'N/A'}
Overall Sentiment: ${sentiment || 'mixed'}
Crisis Level: ${crisisLevel || 'none'}
Emotion Breakdown: ${emotions?.map((e: any) => `${e.emotion}: ${e.percentage}%`).join(', ') || 'Not analyzed'}
Volume Change: ${topic?.change ? `${topic.change > 0 ? '+' : ''}${topic.change}%` : 'N/A'}

Generate a professional analysis report with the following sections:

## Situation Assessment
Brief overview of the current public sentiment landscape (2-3 sentences).

## Key Concerns Identified
- Bullet points of main issues driving sentiment (3-4 points)

## Recommended Actions
Provide 4-5 balanced, actionable recommendations. Each should:
- Start with a clear action verb
- Be specific and implementable
- Consider both immediate and long-term impact
- Not be one-sided or dismissive of public concerns

## Opportunities
- 2-3 potential opportunities that could arise from this situation

## Risk Factors to Monitor
- 2-3 things to watch that could escalate or change the situation

Keep the tone professional, balanced, and constructive. Avoid corporate jargon.`;

    const PARALLEL_API_KEY = Deno.env.get("PARALLEL_API_KEY") || "";

    const chatMessages: any[] = isChat
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the analysis report based on the provided data." }
      ];

    const tools = [
      {
        type: "function",
        function: {
          name: "parallel_web_search",
          description: "Search the web for real-time news, information, or context about a topic to help answer questions or generate reports.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query or objective to find information for.",
              },
            },
            required: ["query"],
          },
        },
      },
    ];

    // Step 1: Call Gemini (non-streaming) to see if it wants to use the search tool
    let aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: chatMessages,
        tools: tools,
        tool_choice: "auto",
        stream: false,
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Failed to communicate with AI provider" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const completionData = await aiResponse.json();
    const responseMessage = completionData.choices?.[0]?.message;

    // Step 2: Check for tool calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      chatMessages.push(responseMessage); // append the assistant's tool call

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === "parallel_web_search") {
          try {
            const args = JSON.parse(toolCall.function.arguments);

            // Call Parallel API
            const searchRes = await fetch("https://api.parallel.ai/v1beta/search", {
              method: "POST",
              headers: {
                "x-api-key": PARALLEL_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                objective: args.query,
                max_results: 3,
              }),
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const searchResultsText = searchData.excerpts?.map((e: any) => e.text).join('\n\n') || JSON.stringify(searchData);
              chatMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: searchResultsText.substring(0, 4000) || "No results found.",
              });
            } else {
              chatMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: "Web search failed or returned no results.",
              });
            }
          } catch (e) {
            chatMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: "Error performing web search.",
            });
          }
        }
      }

      // Step 3: Stream the final response back taking the search results into account
      const finalStreamResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: chatMessages,
          stream: true,
        }),
      });

      return new Response(finalStreamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });

    } else {
      // No tool called - manually stream the response back for the typing effect
      const textResponse = responseMessage?.content || "";
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          // Chunk the response slightly to mimic stream format
          const chunkSize = 20;
          for (let i = 0; i < textResponse.length; i += chunkSize) {
            const chunkChunk = textResponse.substring(i, i + chunkSize);
            const dataStr = JSON.stringify({ choices: [{ delta: { content: chunkChunk } }] });
            controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
            await new Promise(r => setTimeout(r, 10)); // small delay to mimic typing effect
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }
  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
