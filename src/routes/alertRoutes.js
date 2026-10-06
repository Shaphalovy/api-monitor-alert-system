const express = require('express');
const { listAlerts, resolveAlert } = require('../controllers/alertController');

const router = express.Router();

router.get('/', listAlerts);
router.patch('/:id/resolve', resolveAlert);

module.exports = router;