const express = require('express');
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended : true}))

let db
const MongoClient = require('mongodb').MongoClient
MongoClient.connect("mongodb+srv://admin:qwer1234@cluster0.k5lltli.mongodb.net/?retryWrites=true&w=majority", function(error, client){
  db = client.db('security_login')

  db.collection('user').insertOne({이름 : "현준", 나이 : 23}, function(error, result){
    console.log('저장완료')
  })
  
  app.listen(8080, function() {
    console.log('listening on 8080')
  })
})

app.get('/pet', function(요청, 응답) { 
  응답.send('펫용품 사시오')
})