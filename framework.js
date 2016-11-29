const fs = require('fs');

module.exports = {

	readFile : function(filename, callback)
	{
    		fs.readFile(filename, 'utf8', function(err, data) {
			//console.log(data);
			callback(err, data);
		});
	},
	
	timeToMinutes : function(timeString)
	{
		var parts = timeString.split(":");
		return parseInt(parts[0])*60 + parseInt(parts[1]);
	},

	findLastStart : function( someRecords )
	{
		var found = null;
	
		if ( someRecords != null && someRecords.length !=0 )
		{
			for (var i=(someRecords.length-1); i>=0; i--)
			{
				if (someRecords[i].type === "Start")
				{
					found = someRecords[i];
					break;
				}
			}
		}
		return found;
	},
	
	/*
	 * Returns true if either the array is empty or the value exists in the array.
	 *
	**/
	valueInArray : function(value, array)
	{
		var found = (array.length === 0);
	
		if (!found)
		{
			for (var i=0; i<array.length; i++)
			{
				if (array[i] === value)
				{
					found = true;
					break;
				}
			}
		}
		return found;
	},
	
	addDays : function(date, days) 
	{
		var result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	},
	
	getTruncDate : function(date)
	{
		//console.log("getTruncDate date=",date.toString());
		
		var dateString = this.getISODateString(date);
		//console.log("getTruncDate ISODateString=",dateString);
		
		return new Date(Date.parse(dateString));
	},
	
	getISODateString : function(date)
	{
		var dateString = date.toISOString().substr(0,10);
		//console.log("getISODateString returning:", dateString);
		return dateString;
	},
	
	/*
	* Args:
	*  isoDateString : "2016-09-29"
	*  timeString : "12:59:59"
	*
	* Returns:
	*  "2016-09-29T12:59:59.000z"
	*/
	getISODateTimeString : function(isoDateString, timeString)
	{
		return isoDateString + "T" + timeString + ".000Z";
	},
	
	getDates : function(fromDate, toDate)
	{
		var dates = [];
		
		var date = new Date(fromDate.getTime());
		
		while (date <= toDate)
		{
			dates.push(date);
			date = this.addDays(date, 1);
		}
		return dates;
	},
	
	/*
	* Args:
	*   plan: Plan config from the PLAN table
	*/
	getPlanWindows : function(plan, startDate)
	{
		var windows = []
		if (plan.planType === "INDAY")
		{
			windows = this.getInDayPlanWindows(plan, startDate);
		}
		else if (plan.planType === "DAILY")
		{
			windows = this.getDailyPlanWindows(plan, startDate);
		}
		return windows;
	},
	
	getInDayPlanWindows : function(plan, startDate)
	{
		var windows = [];

		var date = this.getTruncDate(startDate ? startDate : new Date());
		console.log("getInDayPlanWindows StartDate:", date);

		for (var d=0; d<plan.days; d++)
		{
			for (var w=0; w<plan.windows.length; w++)
			{
				var window = plan.windows[w];

				var start = new Date(this.getISODateTimeString(this.getISODateString(date), window.start));
				var end = new Date(this.getISODateTimeString(this.getISODateString(date), window.end));

				windows.push({"start": start, "end":end});
			}

			date = this.addDays(date, 1);
		}

		console.log("Plan windows:", JSON.stringify(windows));

		return windows;
	},
	
	getDailyPlanWindows : function(plan, startDate)
	{
		var windows = [];

		var date = this.getTruncDate(startDate ? startDate : new Date());
		console.log("getDailyPlanWindows StartDate:", date);

		for (var d=0; d<plan.days; d++)
		{
			var start = new Date(date.toISOString());
			var end = new Date(this.addDays(start, 1).getTime()-1000);

			windows.push({"start": start, "end":end});
			
			date = this.addDays(date, 1);
		}

		console.log("Plan windows:", JSON.stringify(windows));

		return windows;
	},
	
	// Helper function to find to which time slot between many a given time belongs to.
	// time slots in the array are assumed to be ordered.
	//
	findSlotForTime : function( aTime, windowSlots )
	{
		this.log(5, "findSlotForTime finding: ", JSON.stringify(aTime) + " in windows " + JSON.stringify(windowSlots) );
		var toReturn = -1;

		if ( aTime === null || windowSlots === null )
		{
			return( toReturn );
		}
		if ( aTime < this.timeToMinutes( windowSlots[0].start ) )
		{
			// Time is before first slot.
			// let us assume that the first slot is the right one.
			return( 0 );
		}
		if ( aTime > this.timeToMinutes( windowSlots[windowSlots.length-1].start ) || 
					aTime > this.timeToMinutes( windowSlots[windowSlots.length-1].end ))
		{
			// The start is after the end of the last time slot.
			// the last slot is the one.
			return(windowSlots.length-1);
		}
		for (var d=0; d<windowSlots.length; d++)
		{
			var currentSlot = windowSlots[d];
			var slotFrom = this.timeToMinutes(currentSlot.start);
			var slotTo = this.timeToMinutes(currentSlot.end);
			this.log(5, "slotFrom:", JSON.stringify(slotFrom) + " slotTo : " + JSON.stringify(slotTo) );
			if ( aTime >= slotFrom && aTime <= slotTo )
			{
				toReturn = d;
				break;
			}
		}

		return toReturn;
	},
	
	
	
	// Splits given working hours into given slots
	// workHours expected to be { workStartTime : "08:00:00", workEndTime : "16:00:00" } 
	// timeSlots expected to be [	{"start":"07:00:00","end":"11:59:59"},
	//								{"start":"12:00:00","end":"16:59:59"} ]
	//
	// Returning [	{"start":"07:00:00","end":"11:59:59","availability":239},
	//				{"start":"12:00:00","end":"16:59:59","availability":299}]
	//
	splitWorkHours : function( workHours, timeSlots )
	{
		this.log("DEBUG", "splitWorkHours: workHours " + JSON.stringify(workHours) + ", timeSlots " + JSON.stringify(timeSlots));
		var firstMinute = this.timeToMinutes( workHours.workStartTime );
		var lastMinute = this.timeToMinutes( workHours.workEndTime );

		var howManyMinutes  = lastMinute-firstMinute;
		this.log("DEBUG", "starting : " + workHours.workStartTime + "- End : " + workHours.workEndTime + " : " + howManyMinutes + " minutes" );

		// Let us find the slot which contains the start of the day.
		// if we cant find it, we will count time from start of day and allocate to first slot.
		var currentTimeSlot = this.findSlotForTime( firstMinute, timeSlots );
		var curWindow = 0;

		curWindow = timeSlots[currentTimeSlot];
		var endOfSlotString = curWindow.end; 

		var endOfSlotMinute = this.timeToMinutes( endOfSlotString );
		var portionStartMinute = firstMinute;
		var i = 0;
		var total = 0;
		var toReturn = [];
		for ( i=firstMinute; i< lastMinute; ++i )
		{

			if ( i === endOfSlotMinute )	
			{
				var aPortion = i-portionStartMinute;
				this.log("DEBUG", "For Slot [" + timeSlots[currentTimeSlot].start + "," + timeSlots[currentTimeSlot].end + "], allocated : " + aPortion + " minutes");
				var slotAllocation = timeSlots[currentTimeSlot];
				slotAllocation.availability = aPortion;
				toReturn.push(slotAllocation);

				total = total + aPortion;
				currentTimeSlot++;
				portionStartMinute = i+1;
				// if we find end of slot, we move to next slot.
				// else, we carry counting and will allocate time to last slot for now.
				// Not sure this is correct, but we can revisit.
				if ( currentTimeSlot <= (timeSlots.length-1) )
				{
					endOfSlotString = timeSlots[currentTimeSlot].end; 							
					endOfSlotMinute = this.timeToMinutes( endOfSlotString );

					this.log("TRACE", "Moving to Slot " + currentTimeSlot + " portionStarts : " + portionStartMinute + " ending : " + 
						JSON.stringify( endOfSlotString ) + " mins : " + JSON.stringify(endOfSlotMinute)  ); 

				}
			}													
		}

		var lastPortion = i-portionStartMinute;

		total = total + lastPortion;
		this.log("DEBUG", "Adding " + lastPortion + " minutes to last slot. Total : " + JSON.stringify(total));
		if ( toReturn.length !== 0 )
		{
			toReturn[toReturn.length-1].availability += lastPortion; 
		}
		this.log("DEBUG", "Returning " + JSON.stringify(toReturn));
		return( toReturn );
	},
	
	
	log : function( level, msg  )
	{
		var logLevel = "INFO";
		
		if ( logLevel === "TRACE" )
		{
			if (  level === "TRACE" || level === "INFO" || level === "DEBUG" )
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
	},
	
	convertNbTasksIntoMins : function( numberOfTasks, workPools, aWorkType )
	{
		var toReturn = -1;
		
		if ( workPools !== null &&  aWorkType !== null )
		{

			for (var i=0; i<workPools.length; i++)
			{
				if (workPools[i].name === aWorkType)
				{
					toReturn =  numberOfTasks * workPools[i].taskDuration;
					break;
				}
			}
		}
		return toReturn;
		
	},	
	
	getRandomInteger : function(min, max) 
	{
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	
	getEmployeeSkillCombinations : function(people, skillsOfInterest)
	{
		var skillCombinations = {};
		for (var i=0; i<people.length; i++)
		{
			var skills = "";
			for (var s=0; s<people[i].skills.length; s++)
			{
				if (skillsOfInterest.indexOf(people[i].skills[s].skillCode) > -1)
				{
					skills += people[i].skills[s].skillCode + "|";
				}
			}

			if (skills !== "")
			{
				skills = skills.substr(0, skills.length - 1);
			
				if (!skillCombinations[skills])
				{
					skillCombinations[skills] = 0;
				}
				skillCombinations[skills] ++;
			}
		}
		
		var keys = [];
		for (var key in skillCombinations) 
		{
			if (skillCombinations.hasOwnProperty(key)) 
			{
				keys.push(key);
			}
		}

		keys.sort ();

		// This is just to give a count for each skill grouping
		var sortedHash = {};
		for (var i=0; i<keys.length; i++)
		{
			sortedHash[keys[i]] = skillCombinations[keys[i]];
		}
		
		console.log("getEmployeeSkillCombinations:", keys);

		return {"list" : keys, "count": sortedHash};
	}
};
