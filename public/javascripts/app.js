function get_gameid() {
    return $('main').data('gameid');
}

var alternative_username = String(Math.floor(Math.random() * 10000));
var cookies_was_set = false;

function get_alternative_username() {
    if (Cookies.get('alt-username')) 
        return Cookies.get('alt-username');
    if (!cookies_was_set) {
        Cookies.set('alt-username', alternative_username);
        cookies_was_set = true;
    }
    return alternative_username;
}

function get_username() {
    var username = $('main').data('username');
    return username ? username : "User-" + get_alternative_username();
}

function on_drop_piece(event, ui) {
    var helper = $(ui.helper[0]);

    if (helper.hasClass('new-piece'))
        on_add_piece(event, ui);

    else if (helper.hasClass('piece'))
        on_move_piece(event, ui);
}

function add_piece(id, position, src, title) {
    var img = $('<img>').addClass('piece').attr({
        id: id,
        src: src,
        width: '12%',
        alt: title,
        title: title
    }).css('position', 'absolute').css(position).draggable({
        revert: 'invalid'
    }).data('id', id).appendTo($('main'));
    return img;
}

function on_add_piece(event, ui) {
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    // calculate it's relative position to it's parent
    var parent_pos = $('main').offset();
    var parent_width = $('main').width();
    var parent_height = $('main').height();
    var position = {
        left: ((ui.position.left - parent_pos.left) / parent_width * 100) + "%",
        top: ((ui.position.top - parent_pos.top) / parent_height * 100) + "%"
    };

    var helper = ui.helper[0];
    img = add_piece(guid(), position, helper.src, helper.alt);

    socket.emit('piece add', {id: img.data('id'), position: position, src: helper.src, title: helper.alt});
    console.log("Added new", helper.alt, "to", position);
}

function on_move_piece(event, ui) {
    var helper = ui.helper[0];

    // on_remove_piece still lets on_move_piece run after drop
    if (ui.helper.data('removed'))
        return;

    // change absolute left and right value to relative
    var parent_width = $('main').width();
    var parent_height = $('main').height();
    var position = {
        left: (ui.position.left / parent_width * 100) + "%",
        top: (ui.position.top / parent_height * 100) + "%"
    };
    $(helper).css(position);

    socket.emit('piece move', {id: $(helper).data('id'), position: position});
    console.log("Moved", helper.alt, "to", position);
}

function on_remove_piece(event, ui) {
    // remove piece from board and set data-removed=true
    // to prevent a moved-event to be fired after drop
    var helper = ui.helper[0];
    console.log("Removed", helper.alt);
    ui.helper.data('removed', true);
    socket.emit('piece remove', {id: ui.helper.data('id')});
    $(helper).remove();
}

function on_window_resize(event) {
    // The board must fulfill these requirements:
    //
    // * keep aspect ratio
    // * don't overflow
    // * don't be bigger than background texture (min-height, min-width)

    function clamp(n, min, max) {
        return Math.min(Math.max(n, min), max);
    };

    var board_width = $('main').data('width');
    var board_height = $('main').data('height');
    var board_ratio = board_width / board_height;
    var available_width = $('.main').width();
    var available_height = $('.main').height();
    var available_ratio = available_width / available_height;

    var new_height, new_width;
    if (available_ratio > board_ratio) {
        new_height = clamp(available_height, 100, board_height);
        new_width = (board_ratio * available_height) + "px";
    } else {
        new_width = clamp(available_width, 100, board_width);
        new_height = (available_width / board_ratio) + "px";
    }
    
    // this is necessary to allow down-sizing
    if (new_width > 0.999 * available_width)
        new_width = "100%";

    $('main').css({
        width: new_width,
        height: new_height
    }).show();
}

function add_chat_message(sender, message) {
    var currentdate = new Date(); 
    var time = currentdate.getHours() + ":" + currentdate.getMinutes();
    time = "<small>[" + time + "]</small> ";

    if (message)
        var elem = $('<p>').append(time).append($('<b>').text(sender + ": ")).append($('<span>').text(message));
    else
        var elem = $('<p>').append(time).append($('<i>').text(sender));

    $('.chat-content').append(elem);
    $(".chat-content").scrollTop($(".chat-content")[0].scrollHeight);
}

function set_userlist(all) {
    $('.chat-users ul').empty();
    $.each(all, function(idx, username) {
        $('<li>').text(username).appendTo($('.chat-users ul'));
    });
}

$(function() {
    // change size of the actual board
    window.onresize = on_window_resize;
    on_window_resize(null);

    // enable drag and drop
    $('.left').droppable({
        accept: '.piece',
        drop: on_remove_piece
    });
    $('main').droppable({
        accept: '.new-piece, .piece',
        drop: on_drop_piece,
    });
    $('.left img').draggable({
        helper: function() {
            var width = $('main').width() * 0.12;
            return $(this).clone().attr('width', width);
        },
        revert: 'invalid',
        appendTo: 'body'
    });

    // socket.io events
    socket = io();
    $('.chat-form form').submit(function() {
        var msg = {message: $('#chat-message').val(), sender: get_username()}
        $('#chat-message').val('');
        socket.emit('chat message', msg);
        add_chat_message("You", msg.message);
        console.log("Sent chat message", msg);
        return false;
    });
    socket.on('connect', function() {
        console.log("Joining room", get_gameid());
        set_userlist([get_username()]);
        socket.emit('join', {
            room: get_gameid(),
            username: get_username()
        }, function(users) {
            add_chat_message("You entered the game.");
            console.log("Joined room with users", users);
            set_userlist(users);
        });
    });
    socket.on('joined', function(msg) {
        console.log("User joined room", msg.username);
        set_userlist(msg.all);
        add_chat_message(msg.username + " joined the game.");
    });
    socket.on('left', function(msg) {
        console.log("User left room", msg.username);
        set_userlist(msg.all);
        add_chat_message(msg.username + " left the game.");
    });
    socket.on('chat message', function(msg) {
        console.log("Received chat message", msg);
        add_chat_message(msg.sender, msg.message);
    });
    socket.on('piece add', function(msg) {
        add_piece(msg.id, msg.position, msg.src, msg.title);
        console.log("Received add piece", msg);
    });
    socket.on('piece move', function(msg) {
        $('#' + msg.id).css(msg.position);
        console.log("Received move piece", msg);
    });
    socket.on('piece remove', function(msg) {
        $('#' + msg.id).remove();
        console.log("Received remove piece", msg);
    });

    // load initial board state from server
    $.ajax({
        url: '/game/' + get_gameid() + '/board',
        dataType: 'json'
    }).done(function(data) {
        console.log("Loaded board state from server", data);
        $.each(data.pieces, function(idx, piece) {
            add_piece(piece.id, piece.position, piece.src, piece.title);
        });
    }).fail(function() {
        console.log("Cannot load board state from server :(");
    });
});

var socket;
