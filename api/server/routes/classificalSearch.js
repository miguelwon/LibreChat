const express = require('express');
const axios = require('axios');
const { ObjectId } = require('mongodb');
const { connectJustinaDb } = require('~/db/justina');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const { logger } = require('@librechat/data-schemas');

const router = express.Router();
router.use(requireJwtAuth);

router.post('/', async (req, res) => {
  logger.debug('[classificalSearch] Received request with body:', req.body);
  const { query, page = 1, tribunal, relator, date_min, date_max } = req.body;

  if (!query && !tribunal && !relator && !date_min && !date_max) {
    return res.status(400).json({ message: 'At least one search parameter is required' });
  }

  try {
    const apiUrl = `${process.env.CLASSIFICAL_SEARCH_API_URL}?page=${page}`;
    const payload = { query, tribunal, relator, date_min, date_max };

    const apiResponse = await axios.post(apiUrl, payload, {
      headers: {
        accept: 'application/json',
        'X-API-Key': process.env.CLASSIFICAL_SEARCH_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const searchResults = apiResponse.data.results;
    if (!searchResults || searchResults.length === 0) {
      return res.json(apiResponse.data);
    }

    const justinaDb = await connectJustinaDb();
    const Acordao = justinaDb.collection('acordaos');

    const augmentedResults = await Promise.all(
      searchResults.map(async (result) => {
        if (!result.acordao_id) {
          return { ...result, sumario: null, sumario_ia: null };
        }
        try {
          const doc = await Acordao.findOne({ _id: new ObjectId(result.acordao_id) });
          return {
            ...result,
            sumario: doc ? doc.sumario : null,
            sumario_ia: doc ? doc.sumario_ia : null,
          };
        } catch (e) {
          logger.error(`Error fetching from Justina DB for acordao_id: ${result.acordao_id}`, e);
          return { ...result, sumario: null, sumario_ia: null };
        }
      }),
    );

    logger.debug('[classificalSearch] Augmented results>>:', augmentedResults);
    res.json({ ...apiResponse.data, results: augmentedResults });
  } catch (error) {
    logger.error('Error calling Classifical Search API:', error);
    res.status(500).json({ message: 'Failed to fetch data from Classifical Search API' });
  }
});

module.exports = router; 