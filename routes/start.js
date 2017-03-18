var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    var username = req.cookies.username ? String(req.cookies.username) : "";
    res.render('start', {
        username: username
    });
});

module.exports = router;
