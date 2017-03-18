var express = require('express');
var router = express.Router();
var shortid = require('shortid');

router.post('/', function(req, res, next) {
    var gameid = shortid.generate();

    if (req.body.username)
        res.cookie('username', String(req.body.username));

    res.redirect('/game/' + gameid);
});

module.exports = router;
