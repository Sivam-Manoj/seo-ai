require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'hbs');
app.set('views', './views'); // Set views directory
app.use(express.static('public')); // Serve static files

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Function to fetch Google search results
async function fetchGoogleResults(query) {
  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
    query
  )}&key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CSE_ID}`;
  try {
    const response = await axios.get(url);
    return response.data.items.slice(0, 3).map((item) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
    }));
  } catch (error) {
    console.error('Error fetching Google results:', error);
    return [];
  }
}
// Function to generate SEO content using GPT-4
async function generateSEOContent(results, keyword) {
  const prompt = `
      You are an SEO expert. Based on the following search results, generate an **SEO-optimized product listing** for the keyword "${keyword}" in **JSON format**. Ensure the structure includes all necessary fields for SEO content.
  
      ### Search Results:
      ${results
        .map(
          (r, i) =>
            `(${i + 1}) Title: ${r.title}\nSnippet: ${r.snippet}\nLink: ${
              r.link
            }\n`
        )
        .join('\n')}
      
      ### **Your Task:**
      Analyze the search results and generate an **SEO-optimized product listing** with the following elements in **JSON format**:
  
      1️⃣ **SEO Title**: A compelling, high-ranking title for the product/service.  
      2️⃣ **Meta Description**: A concise and engaging description (250 characters).  
      3️⃣ **SEO Keywords**: A list of high-ranking keywords related to the product/service.  
      4️⃣ **Product Description**: A detailed, engaging, and SEO-friendly description(specs/details). //300 words  
      5️⃣ **Suggested Pricing**: A price range based on market data.  
      6️⃣ **FAQ Section**: Five commonly asked questions with answers related to the product.  
  
      The JSON structure should be as follows:
  
      json
      {
        "seoTitle": "SEO Title Example",
        "metaDescription": "SEO Meta Description Example",
        "seoKeywords": ["keyword1", "keyword2", "keyword3"],
        "productDescription": "Detailed product description here.",
        "suggestedPricing": "$100 - $200",
        "faq": [
          {
            "question": "FAQ Question 1",
            "answer": "FAQ Answer 1"
          },
          {
            "question": "FAQ Question 2",
            "answer": "FAQ Answer 2"
          },
          {
            "question": "FAQ Question 3",
            "answer": "FAQ Answer 3"
          },
          {
            "question": "FAQ Question 4",
            "answer": "FAQ Answer 4"
          },
          {
            "question": "FAQ Question 5",
            "answer": "FAQ Answer 5"
          }
        ]
      }
      Make sure the output is well-structured and contains **valid JSON**. Ensure the content is **unique, human-like**, and highly optimized for search engines.  
    `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.5-preview-2025-02-27',
      messages: [
        {
          role: 'system',
          content: 'You are a highly advanced and experienced SEO analyst.',
        },
        {
          role: 'user',
          content: prompt, // Your SEO prompt goes here
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse the generated content to ensure it's valid JSON
    const seoContent = JSON.parse(completion.choices[0].message.content);
    return seoContent;
  } catch (error) {
    console.error('Error generating SEO content:', error);
    return 'Error generating SEO content.';
  }
}

// Home route - Render UI
app.get('/', (req, res) => {
  res.render('index', { seoData: null, error: null });
});

// API endpoint
app.post('/generate-seo', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword)
    return res.render('index', { seoData: null, error: 'Keyword is required' });

  const results = await fetchGoogleResults(keyword);
  if (results.length === 0)
    return res.render('index', {
      seoData: null,
      error: 'Failed to fetch search results',
    });

  const seoContent = await generateSEOContent(results, keyword);
  res.render('index', { seoData: seoContent, error: null });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
