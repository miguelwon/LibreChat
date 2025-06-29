const express = require('express');
const axios = require('axios');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');

const router = express.Router();
router.use(requireJwtAuth);

router.post('/', async (req, res) => {
  const { query, page = 1 } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const apiUrl = `${process.env.CLASSIFICAL_SEARCH_API_URL}?page=${page}`;
    const payload = { query, page };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.CLASSIFICAL_SEARCH_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error calling Classifical Search API:', error);
    res.status(500).json({ message: 'Failed to fetch data from Classifical Search API' });
  }
});

module.exports = router; 