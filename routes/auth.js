const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');
const User = require('../models/user');

const router = express.Router();

router.post('/account', isNotLoggedIn, async (req, res, next) => {
  const { email, name, userId, password } = req.body;
  try {
    const exUser1 = await User.findOne({ where: { email } }); // 이메일 중복 체크
    const exUser2 = await User.findOne({ where: { userId } }); // 사용자이름 중복 체크
    if (exUser1 || exUser2) {
      return res.redirect('/join?error=exist');
    }
    
    const hash = await bcrypt.hash(password, 12); // password 암호화
    await User.create({
      email,
      name,
      userId,
      password: hash,
    });
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

router.post('/login', isNotLoggedIn, (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) {
      console.error(authError);
      return next(authError);
    }
    if (!user) { // 존재하지 않는 사용자일 경우
      console.log('logloglog');
      console.log(info);
      return res.status(400).send(info)
    }
    return req.login(user, (loginError) => {
      if (loginError) {
        console.error(loginError);
        return next(loginError);
      }
      return res.status(200).send('OK');
    });
  })(req, res, next); // 미들웨어 내의 미들웨어에는 (req, res, next)를 붙입니다.
});

router.get('/logout', isLoggedIn, (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;