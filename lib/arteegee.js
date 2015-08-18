var express = require('express')

var app = express()

app.use(express.static('./public'))

app.set('view engine', 'jade')
app.set('views', './views')

app.route('/')
.get(function(req, res) {
	res.render('layout')
})

var srv = app.listen(process.env.PORT, function() {
	console.log('Listening on '+process.env.PORT)
})

app.use('/peerjs', require('peer').ExpressPeerServer(srv, {
	debug: true
}))
