const qsocks = require('qsocks');
var express = require('express');
var ExpressApp = express();
var bodyParser = require('body-parser');
var fs = require("fs");

var Paths = [];
var global, senseApp, fields = {};
fields["smokers"] = {};
fields["BMI"] = {};
fields["diabetes"] = {};
fields["gender"] = {};

/**** Create Web Server to handle requests to/from Unity ****/
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// Get list of projects
ExpressApp.post('/listPaths', urlencodedParser, function (req, res) {
   // console.log( Paths );
   console.log("listing " + Paths.length + " Paths");
   res.end(JSON.stringify(Paths));
});

// Get field states
ExpressApp.post('/getFieldStates', urlencodedParser, function (req, res) {
   console.log( fields );
   res.end(JSON.stringify(fields));
});

// Filter
ExpressApp.post('/filter', urlencodedParser, function (req, res) {
    var field = req.body.fieldName;
    var value = req.body.fieldValue;
    console.log("Selecting "+value+" in "+field);
    filter(field, value);
    res.end("filtered");
});

// Clear Selections
ExpressApp.post('/clear', urlencodedParser, function (req, res) {
    console.log("Clearing Selections");
    clear();
    res.end("cleared");
});


// Start Server
var server = ExpressApp.listen(8082, '10.150.143.37', 511, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server", host);
  console.log("Qlik middleware app listening at http://%s:%s", host, port);
});


/**** Connect to Qlik App ****/
var config = {
    host: 'pe.qlik.com',
    isSecure: true,
    origin: 'http://localhost',
    appname: '706c1a47-18d8-4e34-b58d-b71039c502fe'
};

qsocks.ConnectOpenApp(config).then(function(connections) {
	global	= connections[0];
	senseApp= connections[1];
    console.log("got senseApp");

    // Sankey Cube
    senseApp.createSessionObject({
        "qInfo": {
            "qType": 'myProjectCube'
        },
        "qHyperCubeDef": {
			"qInitialDataFetch": [
				{
					"qHeight": 5000,
					"qWidth": 2
				}
			],
			"qDimensions": [
				{
					"qDef" : {
						"qFieldDefs" : ["Surgical Path"]
					}
				}
			],
			"qMeasures": [
                {
                    qDef: {
                        qLabel: '# Patients',
                        qDef: '=Count(distinct [Record ID])'
                    },
                    qSortBy: {qSortByNumeric: 1}
                }			],
			// "qSuppressZero": false,
			// "qSuppressMissing": false,
			// "qMode": "S",
			// "qInterColumnSortOrder": [],
			"qStateName": "$"
		}
	}).then(function(pathModel){
		pathModel.getLayout().then(function(layout) {
			// console.log("got app layout",JSON.stringify(layout));
            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
            // console.log("data",JSON.stringify(qMatrix));
            for(i=0; i<qMatrix.length; i++){
	            // console.log(qMatrix[i][0].qText);
                Paths.push(qMatrix[i][0].qText);
            }
            console.log("got " + Paths.length + " Paths");
        });

        pathModel.on('change', function(layout) {
        	pathModel.getLayout().then(function(layout) {
				// console.log("got new data",JSON.stringify(layout));
	            var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
	            // console.log("data",JSON.stringify(qMatrix));
	            Paths = [];
	            for(i=0; i<qMatrix.length; i++){
		            // console.log(qMatrix[i][0].qText);
	                Paths.push(qMatrix[i][0].qText);
	            }
	            console.log("Cube updated. Now " + Paths.length + " Paths");
	        });
        });
	});

	// Fields Table
    var ListObjDefs = {
        "qInfo": {
        	"qId": "CB04",
            "qType": 'Combo'
        },
        "ListObject1": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["BMI Over 25"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["BMI"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        },
        "ListObject2": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["Smoker"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["smoker"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        },
        "ListObject3": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["Has Diabetes"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["diabetes"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        },
        "ListObject4": {
			"qListObjectDef": {
				"qStateName": "$",
				"qLibraryId": "",
				"qDef": {
					"qFieldDefs" : ["Customer Gender"],
					"qSortCriterias": [{
						"qSortByAscii": -1
					}],
					"qFieldLabels": ["gender"]
				},
				"qInitialDataFetch": [
	                {
	                    "qTop": 0,
	                    "qLeft": 0,
	                    "qHeight": 10,
	                    "qWidth": 2,
	                }
	            ],
	            "qShowAlternatives": true
			}
        }
    };

    senseApp.createSessionObject(ListObjDefs).then(function(list){
		list.getLayout().then(function(layout) {
            var qMatrix = layout.ListObject1.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.BMI[qMatrix[i][0].qText] = qMatrix[i][0].qState;
			}

            var qMatrix = layout.ListObject2.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.smokers[qMatrix[i][0].qText] = qMatrix[i][0].qState;
            }

            var qMatrix = layout.ListObject3.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.diabetes[qMatrix[i][0].qText] = qMatrix[i][0].qState;
            }

            var qMatrix = layout.ListObject4.qListObject.qDataPages[0].qMatrix;
            for(i=0; i<qMatrix.length; i++){
	            console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
	            fields.gender[qMatrix[i][0].qText] = qMatrix[i][0].qState;
			}
        });

        list.on('change', function(layout) {
        	list.getLayout().then(function(layout) {
				console.log("BMI Exclusions",layout.ListObject1.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject1.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            fields.BMI[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }

				console.log("Smoker Exclusions",layout.ListObject2.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject2.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            // console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
		            fields.smokers[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }

				console.log("Diabetes Exclusions",layout.ListObject3.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject3.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            // console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
		            fields.diabetes[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }
				
				console.log("Gender Exclusions",layout.ListObject4.qListObject.qDimensionInfo.qStateCounts.qExcluded);
	            var qMatrix = layout.ListObject4.qListObject.qDataPages[0].qMatrix;
	            for(i=0; i<qMatrix.length; i++){
		            // console.log(qMatrix[i][0].qText, qMatrix[i][0].qState);
		            fields.gender[qMatrix[i][0].qText] = qMatrix[i][0].qState;
	            }
	        });
        });
	});

}).catch(function(err){
	console.log(err);
})


// Fetch a field
function filter(fieldName, fieldValue){
    senseApp.getField("["+fieldName+"]").then(function(field) {
        // Issue a selection on the field handle.
        field.select(fieldValue, false, 1).then(console.log, console.log); 
    });
}

// Clear Selections
function clear(){
    senseApp.clearAll().then(function() {
        console.log("Cleared selections");
        reset();
    });
}

// Reset Selections
function reset(){
    senseApp.getField("[First Procedure]").then(function(field) {
//        field.select("1 INT MAM-COR ART BYPASS").then(console.log, console.log); 
        field.select("ALVEOLOPLASTY").then(console.log, console.log); 
    });
}
