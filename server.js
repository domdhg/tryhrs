"use strict";

var express = require("express");
var fs = require("fs");
var path = require("path");
var bodyParser = require("body-parser");


var fw = require("./framework.js");

var app = express();

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// By default, LogLevel is at INFO
//
app.theLogLevel = "INFO";
var Logger = require("./logger.js");

var server = app.listen(process.env.PORT || 8888, function () {
		var port = server.address().port;
		console.log("App now running on port", port);
	});

// Generic error handler used by all endpoints.
//
function handleError(res, reason, message, code)
{
	console.log("ERROR: " + reason);
	res.status(code || 500).json({"error": message});
}


/*
** REST SERVICES
**
** Error Codes:
**
**    200 : OK, The request was successful
**    201 : CREATED, A new resource object was successfully created
**    404 : NOT FOUND, The requested resource could not be found
**    400 : BAD REQUEST, The request was malformed or invalid
**    500 : INTERNAL SERVER ERROR, Unknown server error has occurred
**
*/

app.get('/api', function(req, res){
	
	var toReturn = [];
	for (var i=0; i< app._router.stack.length; ++i)
	{
		if ( app._router.stack[i].name === "bound dispatch" )
		{
			var record = {};
			record.route = {};
			record.route.path = app._router.stack[i].route.path;
			record.route.methods = app._router.stack[i].route.methods;
			toReturn.push( record );
		}
	}
	res.status(200).json(toReturn);
});

app.get("/domtest", function(req, res) 
{
	var l = new Logger(app);
	
	res.status(200).json("Hello");
	
});

app.put("/start", function (req, res)
{

	fw.log("INFO", "PUT start running...");

	var givenTime = req.query.time;
	
	if ( app.timeRecords == null )
	{
		app.timeRecords = [];
	}		
	var currentDate = new Date();
	var aTimeRecord = {};
	
	aTimeRecord.type = "Start";
	aTimeRecord.start = currentDate;
	app.timeRecords.push( aTimeRecord );
	
	console.log("INFO", "Start set to : " + JSON.stringify( aTimeRecord ));
	res.status(200).json(aTimeRecord);
	
});

app.put("/end", function (req, res)
{
	fw.log("INFO", "PUT end running...");

	if ( app.timeRecords != null )
	{
		var found = fw.findLastStart(app.timeRecords);
		if ( found ) 
		{
			found.end = new Date();
		}
		else
		{
			res.status(200).json("No Start");
		}
	}		
	else
	{
		res.status(200).json("No records");
	}
	
	console.log("INFO", "End set to : " + JSON.stringify( found.end ));
	res.status(200).json(found);
	
});

app.get("/start", function (req, res)
{

	fw.log("INFO", "GET start running...");
	if ( app.timeRecords != null )
	{
		var found = fw.findLastStart(app.timeRecords);
		console.log("INFO", "Start : " + JSON.stringify(found));
		res.status(200).json(found);
	}
	else
	{
		res.status(200).json("Not set");
	}	
	
});

app.get("/list", function (req, res)
{

	fw.log("INFO", "GET list running...");
	if ( app.timeRecords != null )
	{
		console.log("INFO", "Start : " + JSON.stringify(app.timeRecords));
		res.status(200).json(app.timeRecords);
	}
	else
	{
		res.status(200).json("timeRecords not set");
	}	
	
});
	
app.get("/left", function (req, res)
{

	fw.log("INFO", "GET left running...");
	if ( app.theStart != null )
	{
		console.log("INFO", "Start : " + JSON.stringify(app.theStart));
		var currentTime = new Date();
		var currentTimeMils = currentTime.getTime();
		var startTimeMils = app.theStart.getTime();
		var difference = (currentTimeMils - startTimeMils)/60000;
		var left = ((7*60)+24)-difference;
		console.log("INFO", "CurrentTime : " + currentTime);
		console.log("INFO", "Difference : " + difference);
		res.status(200).json(left);
	}
	else
	{
		res.status(200).json("Start Not set");
	}	
	
});

// Log Level functions
//
app.put("/loglevel", function (req, res)
{

	fw.log("INFO", "loglevel update running...");

	var givenLogLevel = req.query.level;
	app.theLogLevel = givenLogLevel;

	var givenUserName = req.get('username');

	if (givenUserName === null)
	{
		handleError(res, "No 'username' param specified.", "No 'username' param specified.");
	}
	else
	{
		console.log("INFO", "LogLevel set to : " + JSON.stringify(app.theLogLevel));
		res.status(200).json(app.theLogLevel);
	}
});

app.get("/loglevel", function(req, res) {
					
	fw.log("INFO", "loglevel GET running...");
	
	var givenUserName = req.get('username');
	
	if ( givenUserName === null )
	{
		handleError(res, "No 'username' param specified.", "No 'username' param specified." );
	}
	else
	{
		console.log( "INFO", "LogLevel is set to : " + JSON.stringify( app.theLogLevel ) );
		res.status(200).json(app.theLogLevel);
	}	
		
});


