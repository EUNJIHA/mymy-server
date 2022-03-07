module.exports = function (app) {
  const user = require("../controllers/userController");
  const jwtMiddleware = require("../../../config/jwtMiddleware");

  app.route("/user").post(user.signUp);
  app.route("/login").post(user.signIn);
  app.get("/login/auto", jwtMiddleware, user.check);

  app.route("/login/auth").post(user.authSignIn);
  app.route("/token").post(user.token);

  app.route("/token/auth").post(user.authToken);
  app.route("/reset-password").post(user.resetpassword);

  app.get("/user", jwtMiddleware, user.showUser);

  app.patch("/user", jwtMiddleware, user.patchUser);

  app.delete("/user", jwtMiddleware, user.deleteUser);

  app.get("/info", jwtMiddleware, user.selectInfo);
};
