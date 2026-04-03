import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, context } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error('GEMINI_API_KEY is not set');
        return res.status(500).json({ error: 'AI service configuration missing' });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const systemPrompt = `You are a helpful and concise assistant for a blockchain crowdfunding campaign.
You have access to the following live campaign data:
${context || 'No context available.'}
Answer questions clearly and concisely. Do not make up numbers. Use the provided context. If you don't know the answer based on the context, state that clearly. Your response should be easy to read. You may use markdown for emphasis.`;

        // Setting up the chat session
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I will act as the assistant using the provided context." }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessageStream(message);
        
        // Setup Server-Sent Events headers for streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(chunkText);
        }

        res.end();

    } catch (error) {
        console.error('Error generating AI response:', error);
        res.status(500).json({ error: 'An error occurred while communicating with the AI service' });
    }
}
