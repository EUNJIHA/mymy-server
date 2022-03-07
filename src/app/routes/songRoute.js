module.exports = function (app) {
  const song = require("../controllers/songController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/recommended-songs", jwtMiddleware, song.getRecommendedSongs);

  app.get("/songs", jwtMiddleware, song.getSongs);

  app.get("/song", jwtMiddleware, song.getSong);

  app.get("/songs/ranking", jwtMiddleware, song.getSongsRanking);
};
