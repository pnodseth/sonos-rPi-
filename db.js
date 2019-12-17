const { MongoClient } = require("mongodb");

var state = {
  db: null
};

exports.connect = async function(url, done) {
  if (state.db) return done();

  state.db = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  try {
    await state.db.connect();
  } catch (err) {
    return done(err);
  }
};

exports.get = function() {
  return state.db;
};

exports.close = function(done) {
  if (state.db) {
    state.db.close(function(err, result) {
      state.db = null;
      state.mode = null;
      done(err);
    });
  }
};
