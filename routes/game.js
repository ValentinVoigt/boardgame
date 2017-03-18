var express = require('express');
var router = express.Router();

newgame = function(req, res, next) {
    var username = req.cookies.username ? String(req.cookies.username) : "";

    res.render('game', {
        gameid: req.params.gameid,
        username: username
    });
}

router.get('/:gameid', newgame);
router.post('/:gameid', newgame);

router.get('/', function(req, res, next) {
    res.redirect('/');
});

router.get('/:gameid/board', function(req, res, next) {
    var pieces = req.db.get('pieces');

    pieces.find({room: req.params.gameid}).then((docs) => {
        res.send({
            pieces: docs
        });
    });
});

module.exports = router;
