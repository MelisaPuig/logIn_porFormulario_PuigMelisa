class User {
  constructor() {
    this.forceLogin = this.forceLogin.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.get = this.get.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  forceLogin(req, res, next) {
    try {
      const user = this.get(req);
      if (user !== null) {
        next();
        return;
      }
      res.redirect(302, "/login");
    } catch (error) {
      next(error);
    }
  }

  handleLogin(req, res, next) {
    try {
      const userData = req.body;
      Object.keys(userData).forEach((key) => {
        req.session[key] = userData[key];
      });
      req.session.isLoggedIn = true;
      res.redirect(302, "/");
    } catch (error) {
      next(error);
    }
  }

  get(req) {
    if (!req.session.isLoggedIn) {
      return null;
    }
    return req.session;
  }

  handleLogout(req, res, next) {
    try {
      const { username } = req.session;
      req.session.destroy();
      res.render("logout", { username });
    } catch (error) {
      next(error);
    }
  }

  /**
   *  PRIVATE METHODS.
   */
}

module.exports = new User();
