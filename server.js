const express = require('express');
const app = express();
const cors = require('cors');
const moment = require('moment');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const _ = require('lodash');
require('dotenv').config();

// Models
const User = mongoose.model(
  'User',
  new mongoose.Schema({
    username: {
      type: String,
    },
  }),
);
const Exercise = mongoose.model(
  'Exercise',
  new mongoose.Schema({
    username: String,
    description: String,
    duration: Number,
    date: Date,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }),
);

const saveUser = function (username, done) {
  const user = new User({ username });
  user.save(function (err, result) {
    if (err) done(err);
    done(null, result);
  });
};

const getUserById = function (id, done) {
  User.findById(id, function (err, user) {
    if (err) done(err);
    done(null, user);
  });
};

const getUsers = function (done) {
  User.find(function (err, result) {
    if (err) done(err);
    done(null, result);
  });
};

const saveExercise = function (userId, exercise, done) {
  User.findById(userId, function (err, user) {
    if (err) done(err);
    const newExercise = new Exercise({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date ? exercise.date : new Date().toDateString(),
      userId: user._id,
    });
    newExercise.save(function (err, result) {
      if (err) done(err);
      done(null, result);
    });
  });
};

const getLogs = function (userId, { from, to, limit }, done) {
  from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
  to = moment(to, 'YYYY-MM-DD').isValid()
    ? moment(to, 'YYYY-MM-DD')
    : moment().add(1000000000000);
  Exercise.find({
    userId,
  })
    .where('date')
    .gte(from)
    .lte(to)
    .limit(+limit)
    .exec(function (err, result) {
      if (err) {
        done(err);
      }
      done(null, result);
    });
};

// API

// middlewares
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());

// endpoints
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', function (req, res) {
  const { username } = req.body;
  saveUser(username, function (err, user) {
    if (err) console.log(err);
    return res.json(_.pick(user, ['username', '_id']));
  });
});

app.get('/api/users', function (req, res) {
  getUsers(function (err, users) {
    return res.json(users.map((user) => _.pick(user, ['username', '_id'])));
  });
});

app.post('/api/users/:id/exercises', function (req, res) {
  const { id } = req.params;
  const { description, duration, date } = req.body;
  saveExercise(id, { description, duration, date }, function (err, exercise) {
    return res.json(
      _.pick(exercise, [
        'username',
        'description',
        'duration',
        'date',
        'userId',
      ]),
    );
  });
});

app.get('/api/users/:id/logs', function (req, res) {
  const { id } = req.params;
  const { limit, from, to } = req.query;
  getLogs(id, { from, to, limit }, function (err, result) {
    const logs = result.map((log) =>
      _.pick(log, ['description', 'duration', 'date']),
    );
    getUserById(id, function (err, user) {
      return res.json({
        username: user.username,
        userId: user._id,
        count: logs.length,
        logs,
      });
    });
  });
});

// connect to db
mongoose.connect(
  'mongodb+srv://admin:admin@exercisetracker.hztwe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
);

// listen app
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
