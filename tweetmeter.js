/**************************
 * Simple graph maanger
 */
function Graph(graphPlaceholder) {
	this.graphPlaceholder = $(graphPlaceholder);
	this.series = {}
}

/**
 * Add a series to the graph with the given data
 */
Graph.prototype.addSeries = function(seriesID, dailyCounts) {
	var date;
	var data = [];
	var id;

	for(date in dailyCounts) {
		data[data.length] = [Date.parse(date), 0.00 + dailyCounts[date] ];
	}

	this.series[seriesID] = data;

	this.replot();
}

/**
 * Remove a series from the graph
 */
Graph.prototype.removeSeries = function(seriesID) {
	delete this.series[seriesID];
	this.replot();
}

Graph.prototype.replot = function() {
	plotData = [];
	for(id in this.series) {
		plotData.push({ 
			label : $('#' + id).val(),
			data : this.series[id]
		});
	}

	$.plot(this.graphPlaceholder, plotData, {	
		xaxis: {
			mode: "time"
		}
	});
}

/**************************
 * Get daily counts of tweets with the given search keyword.
 * Will look through numPages pages of search results, and pass the result to onSuccess when it's done
 */ 
function twitterDailyCounts(keyword, numPages, onSuccess) {
	// Make a closure variable for collating daily counts
	var __dailyCounts = {};
	
	// Internal recursive ajax callback
	var internalResultHandler = function(data) {
		var i,d,date;
		
		// Update __dailyCounts with the content from this page of search results
		for(i=0;i<data.results.length;i++) {
			if(data.results[i].created_at.match(/^([A-Z]+, [0-9]+ [A-Z]+ [0-9]+)/i)) {
				date = RegExp.$1;

				if(typeof __dailyCounts[date] == 'undefined') __dailyCounts[date] = 0;
				__dailyCounts[date]++;
			} else {
				console.log("Can't parse date: " + data.results[i].created_at);
			}
		}

		if(data.next_page && data.page < numPages) {
			// Recursively work through pages of the search results
			$.getJSON('ajax-proxy.php?url=http://search.twitter.com/search.json' + data.next_page.replace(/&/g,'%26'), internalResultHandler);
		} else {
			// Break out of this handler and into the post-processor
			onSuccess(__dailyCounts);
		}
	}
	
	// Kick things off with the first page request.  Note that we define internalResultHandler first so that we can call
	// it recursively
	$.getJSON('ajax-proxy.php?url=http://search.twitter.com/search.json?q=' + keyword, internalResultHandler);
}

$('document').ready(function() {
	var NUM_PAGES = 30;

	// Set up a graph manager on the placeholder
	var __graph = new Graph('#placeholder');

	$('#keywordform input')
		// Whenever one of the input fields are changes
		.change(function () {
			var id = $(this).attr('id');
			if($(this).val()) {
				// Show the loading indicator
				var loadingIndicator = $(this).parent().find('span');
				loadingIndicator.show();
				
				// Search twitter for daily counts, and on success add the series to the graph and hide the loading indicator
				twitterDailyCounts($(this).val(), NUM_PAGES, function(dailyCounts) {
					__graph.addSeries(id, dailyCounts);
					loadingIndicator.hide();
				});
				
			} else {
				__graph.removeSeries(id);				
			}
		})
		// Call all the onchange handlers
		.change();
	
});