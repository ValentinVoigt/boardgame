module.exports = function(app, db, io) {

var pieces = db.get('pieces');

io.on('connection', function(socket) {
    socket.on('join', function(msg) {
        socket.join(msg.room);
        socket.room = msg.room;
        socket.username = msg.username;
        socket.to(socket.room).emit('joined', {username: socket.username});
    });
    socket.on('disconnect', function() {
        socket.to(socket.room).emit('left', {username: socket.username});
    });
    socket.on('chat message', function(msg) {
        socket.to(socket.room).emit('chat message', msg);
    });
    socket.on('piece add', function(msg) {
        msg.room = socket.room;
        pieces.insert(msg);
        socket.to(socket.room).emit('piece add', msg);
    });
    socket.on('piece move', function(msg) {
        pieces.update({id: msg.id, room: socket.room}, {$set: msg});
        socket.to(socket.room).emit('piece move', msg);
    });
    socket.on('piece remove', function(msg) {
        pieces.remove({id: msg.id, room: socket.room});
        socket.to(socket.room).emit('piece remove', msg);
    });
});
};
