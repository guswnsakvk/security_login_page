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

app.use(helmet({
	contentSecurityPolicy: cspOptions,
  crossOriginEmbedderPolicy: false
}));

// Response Headers에
// Server와 X-Powered-By 헤더 정보가 사라짐
app.use(helmet.hidePoweredBy())

// XSS(교차 사이트 스크립팅) 방어
app.use(helmet.xssFilter());

// 클릭재킹 방어
app.use(helmet.frameguard("deny"));

// // MIME 스니핑 차단
app.use(helmet.noSniff());

// 몽고디비 연결하는 코드
let db
const MongoClient = require('mongodb').MongoClient
MongoClient.connect("mongodb+srv://test:1234@cluster0.k5lltli.mongodb.net/?retryWrites=true&w=majority", function(error, client){
  db = client.db('security_login')
    
  app.listen(8080, function() {
    console.log('listening on 8080')
  })
})

app.get('/', function(요청, 응답){
  응답.render('index.ejs')
})

app.get('/login_success/:id', function(요청, 응답){
  응답.render('login_success.ejs', {userName : 요청.params.id})
})

app.post('/', function (요청, 응답) {
  passport.authenticate('local', {}, function(error, user, msg){
      if (!user) {
        if(msg.message === '비번틀렸어요' && msg.idBlock === "false"){
          db.collection("user").findOne({id:msg.userId}, function(에러, 결과){
            if(결과.count < 5){
              db.collection("user").updateOne({id:msg.userId}, {$inc: {count : 1}}, function(에러, 결과){
                console.log("1증가함")
              })
            } else if(결과.count === 5 && msg.idBlock === 'false'){
                db.collection("user").updateOne({id:msg.userId}, {$set: {block : "true", date : new Date()}}, function(에러, 결과){
                  console.log("block됨")
              })
            }
          })
        }
        console.log(msg)
        응답.status(400).send({message : msg})
      } else {
        요청.login(user, function(err){
          console.log(user)
          if(err){
            응답.status(400).send({message : msg})
            return next(err) 
          }
          if(user.block === 'true'){
            const loginTime = new Date()
            console.log("user" + user.date)
            console.log("login : " + loginTime)
            const loginLastTime = loginTime - user.date
            console.log('loginLastTime : ' + loginLastTime)
            if(loginLastTime > 900000){
              db.collection("user").updateOne({id: user.id}, {$set : {block : "false", date : "없음", count : 0}})
              응답.status(200).send({name : user})
            } else{
              응답.status(400).send({message : {message : "계정이 막혔습니다."}})
            }
          } else{
            응답.status(200).send({name : user})
          }
          // if(user.block === 'true'){
          //   응답.status(400).send({message : {message : "계정이 막혔습니다."}})
          // } else{
          //   응답.status(200).send({name : user})
          // }
        });
      }
  })(요청, 응답);
});

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  db.collection('user').findOne({ id: 입력한아이디 }, function (에러, 결과) {
    // 에러확인
    if (에러) return done(에러, {message: '에러가 있습니다.'})

    // 아이디 확인
    if (!결과) return done(null, false, { message: '존재하지않는 아이디입니다' })

    // 비밀번호 확인
    // 암호복구
    let userPW = 결과.pw
    let bytes = CryptoJS.AES.decrypt(userPW, secretKey)
    let decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    console.log('암호복구 : ' + decrypted)

    if (입력한비번 == decrypted) {
      return done(null, 결과, {message : "로그인성공했어요"})
    } else {
      return done(null, false, { message: '비번틀렸어요', userId: 결과.id, idBlock: 결과.block})
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

      db.collection("user").insertOne({id : 요청.body.id, pw : encrypted, count : 0, block : false, date:"없음"}, function(){
        console.log('저장완료')
        응답.status(200).send({message : "회원가입 성공했습니다."})
      })
    }
  })
})