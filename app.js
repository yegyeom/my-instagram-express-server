const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const cors = require('cors');

dotenv.config();
const pageRouter = require('./routes/page');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const postRouter = require('./routes/post');
const { sequelize } = require('./models');
const passportConfig = require('./passport');

// 익스프레스 객체 생성
var app = express();
// 패스포트 설정
passportConfig();
// 기본 포트를 app 객체에 속성으로 설정
app.set('port', process.env.PORT || 8012);

app.use(cors({ origin: true, credentials: true }));

sequelize.sync({ force: false })
    .then(() => {
        console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
        console.log(err);
    });

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
}));
app.use(passport.initialize()); // 요청 객체에 passport 설정을 심음
app.use(passport.session()); // req.session 객체에 passport 정보를 저장

app.use('/api/page', pageRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/post', postRouter);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

// 화면 engine을 ejs로 설정
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use((req, res, next) => {
    const error = new Error(`${req.method} ${res.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
})

// Express 서버 시작
app.listen(app.get('port'), () => {
    console.log('익스프레스 서버를 시작했습니다. : ' + app.get('port'));
});