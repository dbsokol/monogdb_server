const WebSocket = require('ws');
var parseData = require('./parseData');

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

const portsData = require('./BeamPortData.js');

//getRFMSpectrum(portsData.ports)
buildports(portsData);

function buildports(portsData){
	let ports = [];
	portsData.ports.forEach(port => {
		portsData.subbeams.some(beam =>{
			if(beam.portId === port.portId){
				ports.push(port);
				return true;
			}
		})
	});
	getRFMSpectrum(ports)
}

async function getRFMSpectrum(ports){
	console.log(ports.length);
	var i = 30;
	const j = 40;
	while(i<j){
		console.log(ports[i].portId);
		const spectrumData = await GetSpectrum(ports[i].portId);
		//console.log(spectrumData);
		//console.log("***************");
		insertPortData(spectrumData);
		i++;
	}
}

function insertPortData(data){
	MongoClient.connect(url, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("labelingData");
	  dbo.collection("portTraces").insertOne(data, function(err, res) {
	    if (err) throw err;
	    console.log("1 document inserted");
	    db.close();
	  });
	});
}

async function GetSpectrum(portID) {
  var dataToParse = {};
  const ws = new WebSocket('wss://umiwss.soc.intelsat.com/');
  var samples = 0;
  var samplesToGet = 14;
  const startTimeMills = (samplesToGet + 2)*1000*60;
  const pullInterval = 300;
  var spectrumList = [];
  var traceArray = [];
  var resolver2; 

  dataToParse["port"] = portID

  ws.on('open', function open() {
		//console.log('Starting data collection');
	  getTraceIDs(); //Timer even based on defined interval
	});


  return new Promise(resolve => {
		
		ws.on('message', function incoming(msg) {
			const data = JSON.parse(msg)
			if(data.ListType === 2){
        //console.log(data.SpectrumsList)
        if(data.SpectrumsList.length < samplesToGet){
          samplesToGet = data.SpectrumsList.length;
        }
        spectrumList = data.SpectrumsList;
        getTraceData(spectrumList[samples].SpectrumID);
      }
      if(data.ListType === 4){
        
        dataToParse["SpecFreqStart"] = data.SpecFreqStart;
        dataToParse["SpecFreqStop"] = data.SpecFreqStop;
        var specTraceString = parseData.parseTrace(data.SpecTraceString);
        traceArray.push(specTraceString);

        if(samples < samplesToGet){
          //console.log(`Getting spectrum for sample # ${samples}`);
          getTraceData(spectrumList[samples].SpectrumID);
        }
        samples++;
      }

      if (samples === samplesToGet){
        //console.log("completed accumelating data");
        //console.log(dataToParse["SpecTraceString"]);
        dataToParse["traceData"] = traceArray;
        ws.close();
        resolve(dataToParse);
      }

      if(data.ListType === 18){
        dataToParse["Beams"] = data.Assets;
      }
      if(data.ListType === 3){
        dataToParse["Carriers"] = data.Assets;
      }
    });
	});

	function getTraceData(traceIndex){
    const message = {
      "ListType": 5,
      "RequestId": "24c1b8ae-7498-4075-8b0e-d339afb8f32c",
      "Channelized": true,
      "SatelliteRefId": "SAT:4733",
      "PortRefId": portID,
      "TraceIndex": traceIndex,
      "AdditionalAssetsWanted": {
        "PortSMSSegmentAssets": true,
        "BeamAssets": true,
        "ConnectivityAssets": true,
        "SubChannelAssets": false,
        "CarrierAssets": true,
        "Nothing": true
      }
    }
    ws.send(JSON.stringify(message));
  }

  function getTraceIDs(){
	  const requestEnd = formatDate(new Date());
	  const requestStart = formatDate(new Date(new Date()-startTimeMills));

	  const message = {
	    "ListType":2,
	    "RequestId": "e7aeff75-012a-47d5-924a-32a42b070a21",
	    "Channelized":true,
	    "SatelliteRefId":"SAT:4733",
	    "PortRefId":portID,
	    "RequestStartDate": requestStart,
	    "RequestStopDate": requestEnd,
	    "AdditionalAssetsWanted":{
	      "PortSMSSegmentAssets":false,
	      "BeamAssets":false,
	      "ConnectivityAssets":false,
	      "SubChannelAssets":false,
	      "CarrierAssets":false,
	      "Nothing":true
	    }
	  }

    ws.send(JSON.stringify(message));
  }

  function formatDate(date){
      return(
        ("0"+(date.getUTCMonth()+1)).slice(-2)
        +"/"+ ("0"+date.getUTCDate()).slice(-2)
        +"/"+ date.getUTCFullYear()
        +" "+ ("0"+date.getUTCHours()).slice(-2)
        +":"+ ("0"+date.getUTCMinutes()).slice(-2)
      );
  }
}
