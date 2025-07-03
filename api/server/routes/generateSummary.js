const express = require('express');
const axios = require('axios');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { logger } = require('~/config');

const router = express.Router();
router.use(requireJwtAuth);

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  logger.debug(`[generateSummary] Received request for id: ${id}`);

  if (!id) {
    return res.status(400).json({ message: 'An ID is required' });
  }

  try {
    const apiUrl = `${process.env.GENERATE_SUMMARY_API_URL}${id}`;
    const apiKey = process.env.CLASSIFICAL_SEARCH_API_KEY;

    if (!apiKey) {
      logger.error('[generateSummary] Missing CLASSIFICAL_SEARCH_API_KEY');
      return res.status(500).json({ message: 'Internal server error: Missing API Key' });
    }

    const apiResponse = await axios.get(apiUrl, {
      headers: {
        accept: 'application/json',
        'X-API-Key': apiKey,
      },
    });

    const { sumario_ia: generatedSummary } = apiResponse.data;

    if (!generatedSummary) {
      logger.warn(`[generateSummary] No summary generated for id: ${id}`);
      return res.status(404).json({ message: 'Could not generate summary' });
    }

    const newSumarioIa = {
      sumario: generatedSummary,
      referencias: [],
      modelo: 'N/A',
      temperatura: 0,
      full_response: JSON.stringify(apiResponse.data),
    };

    logger.debug(`[generateSummary] Successfully generated summary for id: ${id}`);
    res.json(newSumarioIa);
  } catch (error) {
    logger.error(`[generateSummary] Error generating summary for id: ${id}`, error);
    if (error.response) {
      logger.error('[generateSummary] External API response:', error.response.data);
      return res.status(error.response.status).json({
        message: 'Failed to fetch data from Generate Summary API',
        error: error.response.data,
      });
    }
    res.status(500).json({ message: 'Failed to generate summary' });
  }
});

module.exports = router; 