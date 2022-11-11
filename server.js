const express = require('express');
const app = express();

// ejs에서 데이터를 가져올 때 사용하는 body-parser
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended : true}))
app.set('view engine', 'ejs')

// ejs에 css 연결할 떄 사용하는 코드
app.use('/public', express.static('public'))

// 회원가입할 때 사용하는 passport, passport-local, express-session
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 

// 비밀 번호 암호화할 때 사용하는 crypto-js
let CryptoJS = require("crypto-js");
// 암호화, 암호복구할 떄 사용하는 키
let secretKey = 'secret key'

// http 헤더를 적절히 설정하여 웹 취약점막는 helmet
const helmet = require('helmet')
const cspOptions = {
  directives: {
    // 헬멧 기본 옵션 가져오기
    ...helmet.contentSecurityPolicy.getDefaultDirectives(), // 기본 헬멧 설정 객체를 리턴하는 함수를 받아 전개 연산자로 삽입
    
    /* 
    none : 어떳 것도 허용하지 않음
	self : 현재 출처에서는 허용하지만 하위 도메인에서는 허용되지 않음
	unsafe-inline : 인라인 자바스크립트, 인라인 스타일을 허용
	unsafe-eval	: eval과 같은 텍스트 자바스크립트 메커니즘을 허용 
    */
    // 구글 API 도메인과 인라인 스크립트, eval 스크립트를 허용
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "code.jquery.com"]
 
    // 다음과 카카오에서 이미지 소스를 허용
    // 'img-src': ["'self'", 'data:', '*.daumcdn.net', '*.kakaocdn.net'],
    
    // 소스에 https와 http 허용
    // "base-uri" : ["/", "http:"],
  }
}

// app.use(helmet({
// 	contentSecurityPolicy: cspOptions,
// }));
app.use(helmet( { contentSecurityPolicy: false } ));
// 몽고디비 연결하는 코드
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
    // 암호복구
    let userPW = 결과.pw
    let bytes = CryptoJS.AES.decrypt(userPW, secretKey)
    let decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    console.log('암호복구 : ' + decrypted)

    if (입력한비번 == decrypted) {
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
    console.log(에러)
    if(결과){
      응답.status(400).send({message : '이미 사용중인 아이디입니다.'})
    } else{
      let userPW = 요청.body.pw

      console.log('original : ' + userPW)

      // 암호화
      let encrypted = CryptoJS.AES.encrypt(JSON.stringify(userPW), secretKey).toString()
      console.log('암호화 : ' + encrypted)

      db.collection("user").insertOne({id : 요청.body.id, pw : encrypted}, function(){
        console.log('저장완료')
        응답.status(200).send({message : "회원가입 성공했습니다."})
      })
    }
  })
})