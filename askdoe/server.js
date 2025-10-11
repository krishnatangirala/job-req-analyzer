require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const mammoth = require('mammoth');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 5000;
const GRADIENT_API_URL = process.env.GRADIENT_AGENT_URL;
const API_KEY = process.env.GRADIENT_API_KEY;

app.post('/analyze-resume', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const filePath = path.resolve(req.file.path);
    const { value: resumeText } = await mammoth.extractRawText({ path: filePath });

    const response = await axios.post(
      GRADIENT_API_URL,
      {
        messages: [
          { role: 'user', content: `Analyze this resume:\n\n${resumeText}` }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const agentReply = response.data.choices[0].message.content;
    res.json({ response: agentReply });
  } catch (error) {
    console.error('Error analyzing resume:', error.message);
    res.status(500).json({ error: 'Failed to analyze resume.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
