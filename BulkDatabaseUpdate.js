const express = require('express')
const app = express();
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://10.149.192.52:27017/";
var cors = require('cors')
var ObjectID = require('mongodb').ObjectID;


// Parse incoming Get request and return all fields in a single object:
function ParseGetRequest(request, debug=false) {
  var parsed_request = {
    update: (request.query.update == "true"),
  };
  if (debug==true) console.log("| [ParseGetRequest]: Parsing incoming request.");
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
function CreateDatabasePatchQuery(debug=false) {
  var database_query = {}; //{_id: ObjectID("5cc7645f84552d3b8a42912f")};
  if (debug==true) console.log("| [CreateDatabasePatchQuery]: Creating mongo databse query.");
  return database_query;
}


// Create new values:
function CreateNewValues(debug=false) {
  var new_values = { $set: { 
    AbhishekTags: {
      isMatch: false,
      isEmpty: false,
      isNotMatch: false,
      isEdgeMatch: false,
      isEdgeEmpty: false,
      ignore: false,
    }, 
    DanielTags: {
      isMatch: false,
      isEmpty: false,
      isNotMatch: false,
      isEdgeMatch: false,
      isEdgeEmpty: false,
      ignore: false,
    },
    taggedByAbhishek: false,
    taggedByDaniel: false,
  }, };
 
  if (debug==true) console.log("| [CreateNewValues]: Creating array of new values to be updated.");
  return new_values;
}


// Finds records taking the given user as input:
function FindRecords(parent_response, dbo, batch_size, database_query, projection, debug=false) {
  dbo.collection("samples").find(database_query, {projection}).limit(batch_size).toArray(function(err, response) {
  if (err) throw err;
  if (debug==true) console.log("| [FindRecords]: Found [" + response.length + "] records.\n");
  parent_response.send(response);
  });
}


// Update records in the database:
function UpdateRecords(parent_response, dbo, database_query, new_values, debug=false) {
  dbo.collection("samples").updateMany(database_query, new_values, function(err, response) {
    if (err) throw err;
    if (debug==true) console.log("| [UpdateRecords]: Updated [" + response.result.nModified + "] records.");
  });
}


// Set up app:
app.use(cors());
app.use(express.json());


// Patch handler:
app.get('/', (request, response) => {
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    
    if (err) throw err;
    if (request.query.update!="true") {
      console.log(request.query.update!="true")
      db.close();
    }

    var debug = true;

    if (debug) console.log(request.body);
    if (debug) console.log("\n[BulkDatabaseUpdate.js]:_________________________________________________");
        
    var dbo = db.db("labelingData");
    var batch_size = 10;
    var projection = {} // CreateProjection(debug);
    var database_query = CreateDatabasePatchQuery(debug);
    var new_values = CreateNewValues(debug);

    UpdateRecords(response, dbo, database_query, new_values, debug)
    FindRecords(response, dbo, batch_size, database_query, projection, debug)

    db.close();
  
  });
});

app.listen(8001, "0.0.0.0");


