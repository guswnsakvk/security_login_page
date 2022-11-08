const express = require('express');
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended : true}))
app.set('view engine', 'ejs')

app.use('/public', express.static('public'))

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

let db
const MongoClient = require('mongodb').MongoClient
MongoClient.connect("mongodb+srv://test:1234@cluster0.k5lltli.mongodb.net/?retryWrites=true&w=majority", function(error, client){
  db = client.db('security_login')

  // db.collection('user').insertOne({이름 : "현준", 나이 : 23}, function(error, result){
  //   console.log('저장완료')
  // })
  
  app.listen(8080, function() {
    console.log('listening on 8080')
  })
})

app.get('/pet', function(요청, 응답) { 
  응답.send('펫용품 사시오')
})

app.get('/test', function(요청, 응답) { 
  응답.send('test페이지입니다.')
})

app.get('/', function(요청, 응답){
  응답.render('index.ejs')
})

app.get('/login_success', function(요청, 응답){
  응답.render('login_success.ejs')
})

app.post('/', passport.authenticate('local', {failureRedirect : '/'}), function(요청, 응답){
  응답.redirect('login_success')
})

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  db.collection('user').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    // 에러확인
    if (에러) return done(에러)

    // 아이디 확인
    if (!결과) return done(null, false, { message: '존재하지않는 아이디요' })
    
    // 비밀번호 확인
    if (입력한비번 == 결과.pw) {
      return done(null, 결과)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

// 세션정장하는 코드(로그인 성공시 작동)
// user에 결과가 들어감
passport.serializeUser(function (user, done) {
  done(null, user.id)
});

// 세션 데이터를 가진 사람을 DB에서 찾아주세요(마이페이지 접속시 작동)
passport.deserializeUser(function (아이디, done) {
  done(null, {})
}); 

app.get('/join', function(요청, 응답){
  응답.render('join.ejs')
})

app.post("/join", function(요청, 응답){
  // 1. 아이디 중복 확인
  // 1.1 중복시 알람
  // 2. 아이디 조건 걸기(대소문자, 특수문자)
  // 3. 위험문자 제한 걸기
  // 4. 비밀번호 암호화하기
  // 5. 데이터 저장

  db.collection("user").findOne({id : 요청.body.id}, function(에러, 결과){
    if(결과){
      응답.status(400).send({message : '이미 사용중인 아이디입니다.'})
    } else{
      db.collection("user").insertOne({id : 요청.body.id, pw : 요청.body.pw}, function(){
        console.log('저장완료')
        응답.status(200).send({message : "회원가입 성공했습니다."})
      })
    }
  })
})