const cookieSecret = "f30j34f34f";

function isAuthorized(req, res, next) {
  if (req.cookies.user && req.cookies.user.cookieSecret === cookieSecret) {
    next();
  } else {
    res.redirect("/login");
  }
}

module.exports = {
  isAuthorized,
  cookieSecret
};
