const passport = require('passport');
const local = require('./localStrategy');
const User = require('../models/user');

module.exports = () => {
  passport.serializeUser((user, done) => { // 사용자 정보 객체를 세션에 아이디로 저장
    done(null, user.id);
  });

  // passport.deserializeUser((id, done) => {
  //   User.findOne({ where: { id } })
  //     .then(user => done(null, user)) // 세션에 저장한 아이디를 통해 사용자 정보 객체를 불러옴
  //     .catch(err => done(err));
  // });

  passport.deserializeUser((id, done) => {
    User.findOne({
      where: { id },
      include: [{
        model: User,
        attributes: ['id', 'userId'],
        as: 'Followers',
      }, {
        model: User,
        attributes: ['id', 'userId'],
        as: 'Followings',
      }],
    })
      .then(user => done(null, user))
      .catch(err => done(err));
  });

  local();
};