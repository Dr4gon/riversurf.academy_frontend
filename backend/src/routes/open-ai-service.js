const express = require('express');
const { OpenAI } = require('openai');
const OpenAIData = require('../models/open-ai-data');

const path = require('path');
const fs = require('fs');

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  try {
    const { text, uuid } = req.body;

    console.log(`Request from ${uuid} with text: ${text} is processed.`);

    if (!text) {
      return res.status(400).json({ message: 'Kein Text zur Verarbeitung bereitgestellt' });
    }

    const previousMessages = await OpenAIData.find({ contentUserUUID: uuid });

    userContext = [];
    previousMessages.forEach(message => {
      userContext.push({
        role: 'user',
        content: message.contentUser,
      });
      userContext.push({
        role: 'assistant',
        content: message.contentResponse,
      });
    });

    const trainingdata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/trainingdata.json')));
    console.log(trainingdata.messages);

    const response = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: process.env.SYSTEM_CONTENT,
        },
        ...trainingdata.messages,
        ...userContext,
        {
          role: 'user',
          content: text,
        },
      ],
      model: process.env.AI_MODEL,
      max_tokens: parseInt(process.env.MAX_TOKEN, 10),
    });

    const generatedText = response.choices[0].message.content;

    res.json({ reply: generatedText });

    const newEntry = new OpenAIData({
      contentSystem: process.env.SYSTEM_CONTENT,
      contentUser: text,
      contentResponse: generatedText,
      contentModel: process.env.AI_MODEL,
      contentMaxToken: parseInt(process.env.MAX_TOKEN, 10),
      contentUserUUID: uuid,
    });

    await newEntry.save();
  } catch (error) {
    console.error('Fehler bei der Kommunikation mit der OpenAI API:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
});

module.exports = router;
