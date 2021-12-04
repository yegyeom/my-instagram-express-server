const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/user');

module.exports = () => {
  passport.use(new LocalStrategy({
    usernameField: 'userId',
    passwordField: 'password',
  }, async (userId, password, done) => {
    try {
      const exUser = await User.findOne({ where: { userId } });
      if (exUser) {
        const result = await bcrypt.compare(password, exUser.password);
        result ? done(null, exUser) : done(null, false, { message: '비밀번호가 일치하지 않습니다.', num: 1 });
      } else done(null, false, { message: '가입되지 않은 회원입니다.', num: 0 });
    } catch (error) {
      console.error(error);
      done(error);
    }
  }));
};