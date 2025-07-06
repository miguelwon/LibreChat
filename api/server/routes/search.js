const express = require('express');
const router = express.Router();
const { MeiliSearch } = require('meilisearch');
const { requireJwtAuth } = require('~/server/middleware');

router.get('/enable', requireJwtAuth, async (req, res) => {
  try {
    const meiliHost = process.env.MEILI_HOST;
    const meiliApiKey = process.env.MEILI_MASTER_KEY;
    if (!meiliHost) {
      return res.status(200).send(false);
    }

    const client = new MeiliSearch({
      host: meiliHost,
      apiKey: meiliApiKey,
    });

    const health = await client.isHealthy();
    if (!health) {
      return res.status(200).send(false);
    }

    return res.status(200).send(true);
  } catch (err) {
    return res.status(200).send(false);
  }
});

module.exports = router; 