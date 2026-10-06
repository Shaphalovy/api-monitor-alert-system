const express = require('express');
const { monitor } = require('../controllers/monitorController');

const router = express.Router();

router.post('/', monitor);

module.exports = router;