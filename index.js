const express = require('express');
const mongodb = require('mongodb');
const async = require('async');
const randomstring = require("randomstring");
const validUrl = require('valid-url');

const MongoClient = mongodb.MongoClient;
const app = express();

const dbName = "tinyurl";
const dbUrl = process.env.MONGOLAB_URI ? process.env.MONGOLAB_URI + dbName : "mongodb://localhost:27017/" + dbName; //"mongodb://jacob:jacob123@ds063899.mlab.com:63899/fcc-tinyurl";
const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

app.get('/new/*',(req,res) => {
  res.setHeader("Content-Type", "application/json");

  let original_url = req.params[0];
  if(validUrl.isWebUri(original_url)) {

    MongoClient.connect(dbUrl, function (err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:', err);
      } else {
        console.log('Connection established to', dbUrl);
      }

      const collection = db.collection('tinyurl');

      let randomUrlParam = randomstring.generate(4);
      let randomUrlParamAvailable = false;
      async.waterfall([
        (callback) => {
          // check if randomUrlParam is already used
          async.whilst(
            () => {
              return !randomUrlParamAvailable;
            }, (callback) => {
              collection.findOne({
                urlParam: randomUrlParam
              }, (err,doc) => {
                if(doc) {
                  randomUrlParam = randomstring.generate(4);
                }else{
                  randomUrlParamAvailable = true;
                }
                callback(null);
              });
            }, (err) => {
              if(err) callback(err);
              callback(null);
            }
          );
        }, (callback) => {
          // insert
          collection.insertMany([
            {
              urlParam: randomUrlParam,
              origin: original_url
            }
          ],(err,results) => {
            if(err) callback(err);

            res.json({
              "original_url": original_url,
              "short_url": baseUrl+"/"+randomUrlParam
            })
            res.end();
            callback(null);
            db.close();
          })
        }
      ]);
    });

  }else {
    res.json({
      "error": "Wrong url format, make sure you have a valid protocol and real site."
    });
    db.close();
  }
});

app.get('/list', (req,res) => {
  res.setHeader("Content-Type", "application/json");
  MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', dbUrl);
    }

    const collection = db.collection('tinyurl');

    collection.find().toArray((err,docs) => {
      if(err) throw err;
      res.json(docs);
    })

    db.close();
  });
})

app.get('/clearall', (req,res) => {
  res.setHeader("Content-Type", "application/json");
  MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', dbUrl);
    }

    const collection = db.collection('tinyurl');

    collection.remove({},function(err,numberRemoved){
      res.json({
        status: 'Success',
        quantity_removed: numberRemoved.n || numberRemoved.result.n
      })
    });
    db.close();
  });
})

app.get('/', (req,res) => {
  res.setHeader("Content-Type", "application/json");
  res.json({
    Name: 'Url Shortener',
    'Example Usage': [
      baseUrl + '/new/https://www.google.com',
      baseUrl + '/new/http://www.reddit.com'
    ],
    'Example Output': {
      "original_url": baseUrl + "http://www.yahoo.com",
      "short_url": baseUrl + "/N6Sz"
    },
    'List All': baseUrl + "/list",
    'Clear All': baseUrl + "/clearall"
  });
})

app.get('/*', (req,res) => {
  res.setHeader("Content-Type", "application/json");
  let urlParam = req.params[0];
  MongoClient.connect(dbUrl, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', dbUrl);
    }

    const collection = db.collection('tinyurl');

    collection.findOne({
      urlParam
    }, (err,item) => {
      if(err) throw err;
      if(item){
        let origin = item.origin;
        res.redirect(origin);
      }else{
        res.json({
          error: '404'
        })
      }
    });

    db.close();
  });
})


const port = process.env.PORT || 8080;
app.listen(port);
