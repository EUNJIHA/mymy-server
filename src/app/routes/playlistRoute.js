module.exports = function (app) {
  const playlist = require("../controllers/playlistController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.get("/playlist", jwtMiddleware, playlist.getThemes);

  app.post("/playlist", jwtMiddleware, playlist.postTheme);

  app.patch("/playlist/:playlistIdx", jwtMiddleware, playlist.patchTheme);

  app.delete("/playlist/:playlistIdx", jwtMiddleware, playlist.deleteTheme);

  app.get(
    "/playlist/:playlistIdx/songs",
    jwtMiddleware,
    playlist.getThemeSongs
  );

  app.post(
    "/playlist/:playlistIdx/song",
    jwtMiddleware,
    playlist.postThemeSong
  );

  app.delete(
    "/playlist/:playlistIdx/songs/:songIdx",
    jwtMiddleware,
    playlist.deleteThemeSong
  );
};
