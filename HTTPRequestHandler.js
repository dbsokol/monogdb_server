const express = require('express')
const app = express();
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://10.149.192.52:27017/";
var cors = require('cors')
var ObjectID = require('mongodb').ObjectID;


// Parse incoming Get request and return all fields in a single object:
function ParseGetRequest(request, debug=false) {
  var parsed_request = {
    batch_size: 10,//Number(request.query.batch_size),
    user_name: request.headers.user,
  };
  if (debug==true) console.log("| [ParseGetRequest]: Parsing incoming request.");
  return parsed_request;
};


// Parse incoming request and return all fields in a single object:
function ParsePatchRequest(request, debug=false) {
  var parsed_request = {
    _id: ObjectID(request.body._id),
    raw_new_values: request.body,
    batch_size: 1,//Number(request.query.batch_size),
    user_name: request.headers.user,
  };
  if (debug==true) console.log("| [ParsePatchRequest]: Parsing incoming request.");
  return parsed_request;
};


// Create data projection:
function CreateProjection(debug=false) {
  var projection = {
    _id: 0,
    CarrierId: 1,
    taggedByAbhishek: 1,
    taggedByDaniel: 1,
    taggedByML: 1,
  };
  if (debug==true) console.log("| [CreateProjection]: Creating database projection.");
  return projection;
}


// Create database query:
function CreateDatabaseGetQuery(parsed_request, debug=false) {
  if (parsed_request.user_name=="Daniel") var database_query = { taggedByDaniel: false };
  else if (parsed_request.user_name=="Abhishek") var database_query = { taggedByAbhishek: false };
  else var database_query = { taggedByAbhishek: false };
  // else console.log("| [CreateDatabaseGetQuery]: User does not exist in database (user must be either 'Daniel' or 'Abhishek')");
  if (debug==true) console.log("| [CreateDatabaseGetQuery]: Creating mongo databse query.");
  return database_query;
}


// Create database query:
function CreateDatabasePatchQuery(parsed_request, debug=false) {
  var database_query = {_id: parsed_request._id};
  if (debug==true) console.log("| [CreateDatabasePatchQuery]: Creating mongo databse query.");
  return database_query;
}


// Create new values:
function CreateNewValues(parsed_request, debug=false) {
  var new_values = { $set: { taggedByDaniel: parsed_request.test_field, }, };
  if (parsed_request.user_name == "Daniel") {
    var new_values = { $set: { 
      DanielTags: parsed_request.raw_new_values.DanielTags,
      taggedByDaniel: parsed_request.raw_new_values.taggedByDaniel, 
    }, };
  }
  else if (parsed_request.user_name == "Abhishek") {
    var new_values = { $set: { 
      AbhishekTags: parsed_request.raw_new_values.AbhishekTags,
      taggedByAbhishek: parsed_request.raw_new_values.taggedByAbhishek,
    }, };
  }
  else console.log("User does not exist in database (user must be either 'Daniel' or 'Abhishek')");
  if (debug==true) console.log("| [CreateNewValues]: Creating array of new values to be updated.");
  return new_values;
}


// Finds records taking the given user as input:
function FindRecords(parent_response, dbo, parsed_request, database_query, projection, debug=false) {
  dbo.collection("samples").find(database_query, {projection}).limit(parsed_request.batch_size).toArray(function(err, response) {
  if (err) throw err;
  if (debug==true) console.log("| [FindRecords]: Found [" + response.length + "] records.\n");
  parent_response.send(response);
  });
}


// Update records in the database:
function UpdateRecords(dbo, database_query, new_values, debug=false) {
  dbo.collection("samples").updateOne(database_query, new_values, function(err, response) {
    if (err) throw err;
    if (debug==true) console.log("| [UpdateRecords]: Updated [" + response.result.nModified + "] records.");
  });
}


// Set up app:
app.use(cors());
app.use(express.json());


// Get handler:
app.get('/labels', (request, response) => {
	MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    var debug = true;
    if (debug) console.log("\n[HTTPRequestHandler.js]:_________________________________________________");
    var dbo = db.db("labelingData");
    var parsed_request = ParseGetRequest(request, debug);
    var projection = {} // CreateProjection(debug);
    var database_query = CreateDatabaseGetQuery(parsed_request, debug);

    FindRecords(response, dbo, parsed_request, database_query, projection, debug)
    db.close();  
  });
});


// Patch handler:
app.patch('/labels', (request, response) => {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    
    if (err) throw err;
    
    var debug = true;

    if (debug) console.log(request.body);
    if (debug) console.log("\n[HTTPRequestHandler.js]:_________________________________________________");
        
    var dbo = db.db("labelingData");
    var parsed_request = ParsePatchRequest(request, debug);
    var projection = {} // CreateProjection(debug);
    var database_query = CreateDatabasePatchQuery(parsed_request, debug);
    var new_values = CreateNewValues(parsed_request, debug);

    UpdateRecords(dbo, database_query, new_values, debug);
    FindRecords(response, dbo, parsed_request, database_query, projection, debug);

    db.close();
  
  });
});

app.listen(8001, "0.0.0.0");


