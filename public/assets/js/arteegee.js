(function() {

	if(!util.supports.data) {
		$('.no-support').show().next().hide()
		return
	}

	var peer = null
	var peerId = null
	var conn = null
	var opponent = {
		peerId: null
	}
	var turn = false
	var ended = false
	var grid = [
		[],
		[],
		[],
		[],
		[],
		[],
		[]
	]

	function begin() {
		conn.on('data', function(data) {
			switch(data[0]) {
				case 'move':
					if(turn) {
						return
					}

					var i = data[1]
					if(grid[i].length == 6) {
						return
					}

					grid[i].push(opponent.peerId)
					$('#game .grid tr:eq('+(6-grid[i].length)+') td:eq('+i+') .slot').addClass('filled-opponent')

					$('#game .alert p').text('Your move!')
					turn = true

					process()

					break
			}
		})
		conn.on('close', function() {
			if(!ended) {
				$('#game .alert p').text('Opponent forfeited!')
			}
			turn = false
		})
		peer.on('error', function(err) {
			alert(''+err)
			turn = false
		})
	}

	function process() {
		var endedBy = null
		for(var i = 0; i < grid.length && !ended; i++) {
			for(var j = 0; j < 6; j++) {
				if(typeof grid[i][j] === 'undefined') {
					continue
				}

				var match = true
				for(var k = 0; k < 4; k++) {
					if(grid[i][j] !== grid[i][j+k]) {
						match = false
					}
				}
				if(match) {
					endedBy = grid[i][j]
					ended = true
					for(var k = 0; k < 4; k++) {
						$('#game .grid tr:eq('+(6-(j+k)-1)+') td:eq('+i+') .slot').addClass('highlight')
					}
					break
				}

				match = true
				for(var k = 0; k < 4; k++) {
					if(i+k >= 7 || grid[i+k] && grid[i][j] !== grid[i+k][j]) {
						match = false
					}
				}
				if(match) {
					endedBy = grid[i][j]
					ended = true
					for(var k = 0; k < 4; k++) {
						$('#game .grid tr:eq('+(6-j-1)+') td:eq('+(i+k)+') .slot').addClass('highlight')
					}
					break
				}

				match = true
				for(var k = 0; k < 4; k++) {
					if(i+k >= 7 || j+k >= 6 || grid[i][j] !== grid[i+k][j+k]) {
						match = false
					}
				}
				if(match) {
					endedBy = grid[i][j]
					ended = true
					for(var k = 0; k < 4; k++) {
						$('#game .grid tr:eq('+(6-(j+k)-1)+') td:eq('+(i+k)+') .slot').addClass('highlight')
					}
					break
				}

				match = true
				for(var k = 0; k < 4; k++) {
					if(i-k < 0 || grid[i][j] !== grid[i-k][j+k]) {
						match = false
					}
				}
				if(match) {
					endedBy = grid[i][j]
					ended = true
					for(var k = 0; k < 4; k++) {
						$('#game .grid tr:eq('+(6-(j+k)-1)+') td:eq('+(i-k)+') .slot').addClass('highlight')
					}
					break
				}
			}
		}
		if(ended) {
			$('#game .grid').addClass('ended')
			if(endedBy == peerId) {
				$('#game .alert p').text('You won!')
			} else {
				$('#game .alert p').text('You lost!')
			}
			turn = false
		}

		var draw = true
		$.each(grid, function(i, c) {
			if(c.length < 6) {
				draw = false
			}
		})
		if(draw) {
			$('#game .alert p').text('Draw!')
			turn = false
		}
	}

	$('#game .grid tr td').on('click', function(event) {
		event.preventDefault()
		if(!turn) {
			return
		}

		var i = $(this).index()
		if(grid[i].length == 6) {
			return
		}

		grid[i].push(peerId)
		$('#game .grid tr:eq('+(6-grid[i].length)+') td:eq('+i+') .slot').addClass('filled')

		$('#game .alert p').text("Waiting for opponent's move")
		turn = false

		conn.send(['move', i])

		process()
	})

	function initialize() {
		peer = new Peer('', {
			host: location.hostname,
			port: location.port || (location.protocol === 'https:' ? 443 : 80),
			path: '/peerjs',
			debug: 3
		})
		peer.on('open', function(id) {
			peerId = id
		})
		peer.on('error', function(err) {
			alert(''+err)
		})

		// Heroku HTTP routing timeout rule (https://devcenter.heroku.com/articles/websockets#timeouts) workaround
		function ping() {
			console.log(peer)
			peer.socket.send({
				type: 'ping'
			})
			setTimeout(ping, 16000)
		}
		ping()
	}

	function start() {
		initialize()
		peer.on('open', function() {
			$('#game .alert p').text('Waiting for opponent').append($('<span class="pull-right"></span>').text('Peer ID: '+peerId))
			$('#game').show().siblings('section').hide()
			alert('Ask your friend to join using your peer ID: '+peerId)
		})
		peer.on('connection', function(c) {
			if(conn) {
				c.close()
				return
			}
			conn = c
			turn = true
			$('#game .alert p').text('Your move!')
			begin()
		})
	}

	function join() {
		initialize()
		peer.on('open', function() {
			var destId = prompt("Opponent's peer ID:")
			conn = peer.connect(destId, {
				reliable: true
			})
			conn.on('open', function() {
				opponent.peerId = destId
				$('#game .alert p').text("Waiting for opponent's move")
				$('#game').show().siblings('section').hide()
				turn = false
				begin()
			})
		})
	}

	$('a[href="#start"]').on('click', function(event) {
		event.preventDefault()
		start()
	})
	$('a[href="#join"]').on('click', function(event) {
		event.preventDefault()
		join()
	})

	$('#game .grid td').on('mouseenter', function() {
		$('#game .grid tr td:nth-child('+($(this).index()+1)+')').addClass('hover')
	})
	$('#game .grid td').on('mouseleave', function() {
		$('#game .grid tr td:nth-child('+($(this).index()+1)+')').removeClass('hover')
	})

})()
