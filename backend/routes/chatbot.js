const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Course = require('../models/Course');

// POST /api/chatbot/message
router.post('/message', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "AI key not configured" });
    }

    const { OpenAI } = require('openai');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1', // GROQ
    });


    const lowerMsg = message.toLowerCase();
    const wantsGeneralAnswer =
      lowerMsg.includes("explain") ||
      lowerMsg.includes("what is") ||
      lowerMsg.includes("define") ||
      lowerMsg.includes("theory");


    const courses = await Course.find({
      $or: [
        { title: { $regex: message, $options: 'i' } },
        { description: { $regex: message, $options: 'i' } }
      ]
    }).limit(5);

    const baseURL = process.env.FRONTEND_URL || "http://localhost:3000";

    const courseContext = courses.length > 0
      ? courses.map(c => `
Title: ${c.title}
Link: ${baseURL}/courses/${c._id}
Description: ${c.description}
Price: ${c.price}
      `).join('\n\n')
      : "No matching courses found.";


    const systemPrompt = wantsGeneralAnswer
      ? `
You are LearnHub AI assistant.

User wants educational explanation.
Provide clear, structured explanation.

If relevant courses exist, mention them at the end as optional recommendations.
`
      : `
You are LearnHub AI assistant.

STRICT RULES:
1. Recommend ONLY courses from the provided course list.
2. Do NOT invent courses.
3. Always include course link when recommending.
4. If no course matches, say politely that no course is available.
5. Keep response concise and helpful.

Available Courses:
${courseContext}
`;


    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

 
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      max_tokens: 600,
      temperature: 0.4
    });

    const reply = response.choices[0].message.content;

    res.json({ reply });

  } catch (err) {
    console.error("Chatbot Error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;