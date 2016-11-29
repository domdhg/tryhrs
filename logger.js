var app;

module.exports = Logger;

function Logger(_app) {
    app = _app;
}

Logger.prototype.log = function( level, msg  )
	{
		//var logLevel = "DEBUG";
		var logLevel = app.theLogLevel;
		
		if (logLevel === null )
		{
			logLevel="INFO";
		}	
		
		if ( logLevel === "TRACE" )
		{
			if (  level === "TRACE" || level === "DEBUG" || level === "INFO" )
			{
				console.log( msg );
			}
		}
		else if ( logLevel === "DEBUG" )
		{
			if (  level === "INFO" || level === "DEBUG" )
			{
				console.log( msg );
			}
		}
		else if (  level === "INFO"  )
		{
			console.log( msg );
		}
	}

/*
Logger.prototype.log = function( level, msg  )
	{
		var logLevel = "DEBUG";
				
		if ( logLevel == "DEBUG" )
		{
			if (  level == "INFO" || level == "DEBUG" )
			{
				console.log( msg );
			}
		}
		else
		{
			if (  level == "INFO"  )
			{
				console.log( msg );
			}
		}
	}

*/