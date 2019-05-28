// server.js
// where your node app starts

// init project
const express = require('express');
const app = express();
var ejs= require('ejs');
var MongoClient= require('mongodb');
var bodyParser= require('body-parser')
// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.
var passport=require("passport");
var session=require("express-session");
var GitHubStrategy= require('passport-github').Strategy;
var LocalStrategy= require('passport-local');
var ObjectId= require('mongodb').ObjectID
var util = require('util');
var methodOverride = require('method-override');
var partials = require('express-partials');

var helmet= require('helmet');
app.use(helmet.noCache());

var GITHUB_CLIENT_ID = process.env.CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.CLIENT_SECRET;

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(partials());
app.use(methodOverride())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use(session({secret: 'keyboard cat', resave: false, saveUnitialized: false}));

var FileStore = require('session-file-store')(session);
 
app.use(session({
    store: new FileStore({ttl: 60000*100}),
    secret: 'keyboard cat'
}));



MongoClient.connect(process.env.DB, {useNewUrlParser: true}, function(err,db){
    if(err) {
        console.log('Database error: ' + err);
    } else {
        console.log('Successful database connection'); 
  
passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: 'https://branch-droplet.glitch.me/auth/github/callback'
   },
  function(accessToken, refreshToken, profile, cb) {
      return cb(null, profile);
  }
));

  
app.get('/auth/github',
        passport.authenticate('github'));
  
app.get('/auth/github/callback', 
        passport.authenticate('github', {failureRedirect: '/error'}),
        function(req,res){
    console.log(req.user.username)
  req.session.user= req.user.username;
    res.redirect('/success');
});
  

      
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});
 
      
app.get('/success', function(req, res){
        res.redirect('/user/profile.html'); 
  
});
      
app.get('/error', (req, res) => res.send("error logging in"));
      
      
      
      
app.get('/', function(request, response) {
  var poll=[];
  
  db.collection('vote').find({}).toArray(function(err,docs){
    for(var i=0; i<docs.length; i++){
     poll.push(docs[i].name);
    }
    
  response.render(__dirname + '/views/index.html',{poll:poll});
});
  })

  
app.get('/views/polls.html', function(req, res) {
  var ans="";
  db.collection('vote').find({}).toArray(function(err,docs){
    if(docs.length<req.query.poll){
       res.send('Invalid request')
    }
    else{
      
      ans=docs[req.query.poll]
     // console.log(ans)
     //console.log(req.query.show) 
  res.render(__dirname + '/views/polls.html',{poll:ans, hello:'i', show: req.query.show})
    }
  })
})
      
      
app.get('/edit/polls.html', function(req, res) {
  var ans="";
  db.collection('vote').find({}).toArray(function(err,docs){
    if(docs.length<req.query.poll){
       res.send('Invalid request')
    }
    else{
      
      ans=docs[req.query.poll]
     // console.log(ans)
     //console.log(req.query.show) 
  res.render(__dirname + '/edit/polls.html',{poll:ans, hello:'i', show: 'no', user: req.session.user})
    }
  })
})      

      
app.post('/edit/polls.html', function(req, res) {
  var ans=""; 
  db.collection('vote').find({}).toArray(function(err,docs){
      ans=docs[req.query.poll]
//console.log(req.body.choice+": is")
  if(!req.body.choice && !req.body.options){
  
   res.render(__dirname+'/edit/polls.html', {poll:ans, show:'no', user: req.session.user})      
  }
  else{
    
    for(var b=0; b<docs[req.query.poll]['options'].length; b++){
      if(req.body.choice==docs[req.query.poll]['options'][b]){
        docs[req.query.poll]['votes'][b]=parseInt(docs[req.query.poll]['votes'][b])+1;
      }
    }
    
    if(req.body.options){
       docs[req.query.poll]['options'].push(req.body.options);
       docs[req.query.poll]['votes'].push('1');
    }
    
    db.collection('vote').findOneAndUpdate({name: docs[req.query.poll]['name']},{$set:{user:  docs[req.query.poll]['user'], name:  docs[req.query.poll]['name'], options:docs[req.query.poll]['options'], votes:docs[req.query.poll]['votes']}})
    
    
   res.redirect('/user/profile.html')    
    
    
  }

  })
})
      
      
  
app.post('/views/polls.html', function(req, res) {
  var ans=""; 
  db.collection('vote').find({}).toArray(function(err,docs){
      ans=docs[req.query.poll]
//console.log(req.body.choice+": is")
  if(!req.body.choice){
  
   res.render(__dirname+'/views/polls.html', {poll:ans, show:'no'})      
  }
  else{
    
    for(var b=0; b<docs[req.query.poll]['options'].length; b++){
      if(req.body.choice==docs[req.query.poll]['options'][b]){
        docs[req.query.poll]['votes'][b]=parseInt(docs[req.query.poll]['votes'][b])+1;
      }
    }
    
    db.collection('vote').findOneAndUpdate({name: docs[req.query.poll]['name']},{$set:{user:  docs[req.query.poll]['user'], name:  docs[req.query.poll]['name'], options:docs[req.query.poll]['options'], votes:docs[req.query.poll]['votes']}})
    
    
   res.redirect('/')    
    
    
  }

  })
})  
  

app.get('/user/profile.html', ensureAuthenticated, function(req, res) {
  console.log(req.session.user)
  res.render(__dirname+'/user/profile.html',{user: req.session.user})
//res.send('yes')
})
      
      
app.get('/user/polls.html', ensureAuthenticated, function(req, res) {
 
  res.render(__dirname+'/user/polls.html',{user: req.session.user})  
})
      

app.post('/user/polls.html', ensureAuthenticated, function(req,res){
  var mo= req.body.values; var arr=[]

  if(mo!="" && req.body.name!=""){
    mo=mo.split(' ')
      for(var i=0; i< mo.length; i++){
        mo[i]=mo[i].replace(',','')
        arr.push(1)
      }   
    
    db.collection('vote').insertOne({user:req.session.user, name: req.body.name, options:mo, votes: arr})
    
    
  }
  
  
  res.redirect('/user/profile.html')  
})

      
app.get('/user/all.html', ensureAuthenticated, function(req, res) {
  var poll=[];
  
  db.collection('vote').find({}).toArray(function(err,docs){
    for(var i=0; i<docs.length; i++){
     poll.push(docs[i].name);
    }
    
  res.render(__dirname + '/user/all.html',{poll:poll, user: req.session.user});
});
})
      

app.get('/user/me.html', ensureAuthenticated, function(req, res) {
  var poll=[]; var av=[];
  
  db.collection('vote').find({}).toArray(function(err,docs){
    for(var i=0; i< docs.length; i++){
     if(docs[i]['user']==req.session.user){
      av.push([i])
     }
    }
  })
  
  db.collection('vote').find({user:req.session.user}).toArray(function(err,docs){
    for(var i=0; i<docs.length; i++){
     poll.push(docs[i].name);
    }  
    //console.log(docs)
      res.render(__dirname + '/user/me.html',{poll:poll, user: req.session.user, av: av})

  })
  
})

      
app.post('/user/me.html', ensureAuthenticated, function(req, res) {
  var ans=[];
  if(Array.isArray(req.body.cb)){
    ans=req.body.cb;
  }
  else{
    ans=[req.body.cb];
  }
  
  for(var a=0; a<ans.length; a++){
    ans[a]=ans[a].replace(/\D/g,'')
  }
  
  db.collection('vote').find({user:req.session.user}).toArray(function(err,docs){
    for(var b=0; b<ans.length; b++){
    db.collection('vote').remove({_id:ObjectId(docs[ans[b]]._id)}, function(err,docs){
      
    }) 
     
      
    }
  
    //res.send(Array.isArray(req.body.cb))  
    
  })
  res.redirect('/user/profile.html')
})      
  
app.get('/logout', function(req, res){
  req.logout();
  req.session.destroy();
  res.redirect('/');
});
  
      
      
    }
  })

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});


function ensureAuthenticated(req, res, next) {
 // if (req.isAuthenticated()) { return next(); }
  if (req.session.user) { return next(); }
  res.redirect('/')
}
