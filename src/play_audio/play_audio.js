var player = require('play-sound')(opts = {})
 
// $ mplayer foo.mp3 
player.play(__dirname + '/media/Peringatan_Gempa.mp3', function(err){
  if (err) throw err
})