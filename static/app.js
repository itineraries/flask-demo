// ==ClosureCompiler==
// @output_file_name app.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==
/**
 *  @preserve
 *  
 *  NYU CTIP Web
 *  @author David Tsai
 */

function padLeft(str, length, padChar){
	/*
	Pads a string on the left side to the specified length. If the string is
	longer than the specified length, then it is returned without being
	truncated.
	
	Arguments:
		str: the string to pad
		length: the desired length of the string
		padChar: the character to add to the left side of the string
	*/
	while(str.length < length){
		str = padChar + str;
	}
	return str;
}
function startsWith(a, b){
	/*
	Checks whether string A starts with string B.
	
	Arguments:
		a: string A
		b: string B
	*/
	return a.substr(0, b.length) == b;
}

/**
 *  This class represents one suggestion that autocomplete may return.
 *  
 *  Attributes:
 *      mainTextParts:
 *          A list of strings that, when joined, are a string that partially
 *          or fully matches the input string. Even indices are strings that
 *          matched something in the input string, and odd indices are strings
 *          that did not.
 *      secondaryText:
 *          Some additional text that is related to the main text but that does
 *          not necessarily match with the input string.
 * 
 *  @constructor
 */
function Suggestion(){
    this.mainTextParts = [];
    this.secondaryText = "";
}
Suggestion.prototype.addMainTextPart = function(text, isMatch){
	/*
	The main string is usually the name of a place. The parts of it that match
	some or all of what the user typed should be formatted differently to show
	that they matched. The Suggestion class keeps track of this.
	
	The main string is actually an array of strings; the strings at even
	indices matched something in the user input, and the strings at odd indices
	did not.
	
	Arguments:
		text:
			The text to add to the array.
		isMatch:
			Whether the text matched something in the user input.
	*/
	if((this.mainTextParts.length & 1) == isMatch){
		// Two scenarios:
		//  - The next index is odd, and the text did match.
		//  - The next index is even, and the text did not match.
		if(this.mainTextParts.length){
			this.mainTextParts.push(this.mainTextParts.pop() + text);
		}else{
			this.mainTextParts.push("");
			this.mainTextParts.push(text);
		}
	}else{
		// Two scenarios:
		//  - The next index is odd, and the text did not match.
		//  - The next index is even, and the text did match.
		this.mainTextParts.push(text);
	}
};
/**
 *  This class provides a data structure that supports dictionary-like lookups
 *  but where only some characters from the beginning of each key being
 *  required.
 *  
 *  @constructor
 */
function PartialKeyDict(){
	// Use a binary max heap to keep the keys sorted.
	this.heap = [];
}
PartialKeyDict.prototype.insert = function(key, value){
	/*
	Adds the key and value to the dictionary. Returns the new number of items.
	All keys must be strings. Values can be of any type.
	*/
	// TODO: handle duplicate keys
	var parentIndex, temp,
		// Add the new item to the bottom of the heap.
		newIndex = this.heap.push([key, value]) - 1;
	while(newIndex > 0){
		// Find this node's parent.
		parentIndex = Math.floor((newIndex - 1) / 2);
		// If parent node's value is greater than the new value, stop.
		if(this.heap[parentIndex][0] > key){
			break;
		}
		// Swap the parent node and the new node.
		temp = this.heap[parentIndex];
		this.heap[parentIndex] = this.heap[newIndex];
		this.heap[newIndex] = temp;
		newIndex = parentIndex;
	}
	return this.heap.length;
};
PartialKeyDict.prototype.get = function(key){
	/*
	Returns an array of [key, value] pairs where the key starts with the given
	string. This array is in no particular order.
	
	For example, consider this dictionary:
	
	    {"FOOFOO": 1, "FOOBAR": 2, "BARFOO": 3}
	
	In this case, get("FOO") could return [["FOOFOO", 1], ["FOOBAR", 2]] or
	[["FOOBAR", 2], ["FOOFOO", 1]].
	
	They [key, value] pairs are taken straight from the internal heap. As such,
	please do not modify the returned keys. Doing so will corrupt the internal
	heap. Modifying the values, on the other hand, is allowed.
	*/
	// Use an object as a set to keep track of nodes that we need to visit.
	var index, maxKeyIndex, maxKey, toVisit = {0: true}, result = [];
	// Visit all the nodes that are put in the set.
	while(true){
		// Find the index of the node with the greatest key.
		maxKeyIndex = -1;
		maxKey = "";
		for(index in toVisit){
			if(toVisit.hasOwnProperty(index)){
				if(this.heap[index][0] >= maxKey){
					maxKey = this.heap[index][0];
					maxKeyIndex = index;
				}
			}
		}
		// If there were no nodes in the set, stop.
		if(maxKeyIndex < 0){
			break;
		}
		// Remove that node from the set of nodes to visit.
		delete toVisit[maxKeyIndex];
		// Check whether this node's key is greater than or equal to the key.
		if(this.heap[maxKeyIndex][0] >= key){
			if(startsWith(maxKey, key)){
				// Add this node to the results.
				result.push(this.heap[maxKeyIndex]);
			}else if(result.length){
				// We have been iterating through the keys in sorted order.
				// We have iterated past the keys that start with the desired
				// key. We can stop searching now.
				break;
			}
			// Add this node's children to the set of nodes to visit.
			var leftIndex = maxKeyIndex * 2 + 1, rightIndex = leftIndex + 1;
			if(leftIndex < this.heap.length){
				toVisit[leftIndex] = true;
			}
			if(rightIndex < this.heap.length){
				toVisit[rightIndex] = true;
			}
		}
		// If this node's key is less than the key, then we know that all of
		// its children's keys will also be less than the key. We do not need
		// to check that part of the heap.
	}
	return result;
};

function enableLocationAutocomplete(){
	/*
	This function enables a custom autocomplete suggestion list on all elements
	with the class text-location. Suggestions are pulled from the elements'
	existing <datalist> elements and from the Google Maps Places Autocomplete
	Service.
	
	To implement a new source, add a callback to locationAutocompleters. The
	key should be a human-readable string that will show as a heading above the
	group of suggestions in the list. The value is the callback. The callback
	must take two arguments: 1) the element in which the user is typing and
	2) another callback. When the suggestions have been computed, your callback
	should call the second callback, which takes an array of suggestions as the
	sole argument. Use makeSuggestion to create the items in the array of
	suggestions.
	
	Note that if your source does not have any suggestions, it needs not call
	the second callback.
	
	We are not simply using google.maps.places.Autocomplete because we want
	control over the formatting and because we want to combine Google's
	autocomplete suggestions with our own.
	*/
	var i,
		inputGoogleMapsApiKey = document.getElementById("google_maps_api_key"),
		scriptGoogleMapsApi = document.createElement("script"),
		divSuggestions = document.createElement("div"),
		locationAutocompleters = {},
		inputToSuggest = null,
		inputToSuggestLastValue = "",
		inputsLocation = document.getElementsByClassName("text-location"),
		presentSuggestions = function(inputElement, heading, suggestions){
			// TODO
			// This function will display the suggestions.
			console.log(heading);
			for(var i = 0; i < suggestions.length; ++i){
				console.log(" - " + suggestions[i].mainTextParts.join("|"));
				console.log("   " + suggestions[i].secondaryText);
			}
		},
		makeResultCallback = function(inputElement, heading){
			return function(suggestions){
				presentSuggestions(inputElement, heading, suggestions);
			};
		},
		callbackKeyUp = function(event){
			var heading, target = event.target || event.srcElement;
			if(target != inputToSuggest){
				inputToSuggestLastValue = "";
				inputToSuggest = target;
			}
			switch(event.key){
				// TODO
				// Up, down, enter, and tab will be implemented as cases here.
			default:
				if(
					target.value.length &&
					(target.value != inputToSuggestLastValue)
				){
					// The value in the input field has changed.
					// Get new suggestions from all sources.
					for(heading in locationAutocompleters){
						if(locationAutocompleters.hasOwnProperty(heading)){
							locationAutocompleters[heading](
								target,
								makeResultCallback(target, heading)
							);
						}
					}
					inputToSuggestLastValue = target.value;
				}
				break;
			}
		};
	// Listen for keypresses on all elements with the text-location class.
	for(i = 0; i < inputsLocation.length; ++i){
		inputsLocation[i].addEventListener("keyup", callbackKeyUp);
	}
	// Add the Google Maps place autocomplete API as a source.
	if(inputGoogleMapsApiKey){
		// Expose this callback globally. The API calls it after loading.
		window["googleCallback"] = function(){
			// Get the autocomplete service.
			var google_maps = window["google"]["maps"],
				google_maps_places = google_maps["places"],
				SEARCH_CIRCLE_CENTER = new google_maps["LatLng"](
					40.72797042,
					-73.98642518
				),
				SEARCH_CIRCLE_RADIUS = 4500,
				service = new google_maps_places["AutocompleteService"]();
			// Register the source.
			locationAutocompleters["From Google Maps"] = function(
				inputElement,
				callback
			){
				service["getPlacePredictions"](
					{
						"input": inputElement.value,
						"offset": inputElement.selectionStart,
						"location": SEARCH_CIRCLE_CENTER,
						"radius": SEARCH_CIRCLE_RADIUS
					},
					function(predictions, status){
						if(status == "OK"){
							// Transform the predictions into the format that
							// the callback wants.
							var i, j, lastOffset, currOffset, currLength,
								suggestion, strMain,
								objectSF, arrayMatchRanges,
								arraySuggestions = [];
							// Loop through the predictions.
							for(i = 0; i < predictions.length; ++i){
								objectSF = 
									predictions[i]["structured_formatting"];
								// strMain is a string that partially or fully
								// matched the user input.
								strMain = objectSF["main_text"];
								// arrayMatchRanges is an array of ranges of
								// offsets in strMain that matched something
								// in the user input.
								arrayMatchRanges = 
									objectSF["main_text_matched_substrings"];
								// Loop through the ranges of offsets.
								suggestion = new Suggestion();
								lastOffset = 0;
								for(j = 0; j < arrayMatchRanges.length; ++j){
									currOffset = arrayMatchRanges[j]["offset"]
									currLength = arrayMatchRanges[j]["length"];
									// Check for characters that are not a part
									// of a matched substring.
									if(lastOffset < currOffset){
										suggestion.addMainTextPart(
											strMain.substring(
												lastOffset,
												currOffset
											),
											false
										);
									}
									// Add this matched substring.
									suggestion.addMainTextPart(
										strMain.substr(
											currOffset,
											currLength
										),
										true
									);
									// Advance our cursor.
									lastOffset = currOffset + currLength;
								}
								// Check for an unmatched part at the end of
								// the main text.
								if(lastOffset < strMain.length){
									suggestion.addMainTextPart(
										strMain.substr(lastOffset),
										false
									);
								}
								// Save the suggestion.
								suggestion.secondaryText =
									objectSF["secondary_text"];
								arraySuggestions.push(suggestion);
							}
							callback(arraySuggestions);
						}
					}
				);
			};
		};
		// Inject Google's script.
		scriptGoogleMapsApi.src = "https://maps.googleapis.com/maps/api/js?" +
			"key=" + encodeURIComponent(inputGoogleMapsApiKey.value) + "&" +
			"libraries=places&" +
			"callback=googleCallback";
        scriptGoogleMapsApi.async = true;
		scriptGoogleMapsApi.defer = true;
		document.body.appendChild(scriptGoogleMapsApi);
	}
}
window.addEventListener("load", function(){
	var inputOrigin, inputDestination, btnUseGeolocation, btnSwitchOrigDest,
		btnNow, selectDay, inputTimeWhen,
		divPlaceFooter = document.getElementById("place-footer"),
		divUseNow = document.getElementById("use-now"),
		locationCallback = function(position){
			inputOrigin.value =
				position.coords.latitude + "," + position.coords.longitude;
		};
	// Check for the <DIV> below the origin and destination input fields.
	if(divPlaceFooter){
		inputOrigin = document.getElementById("text-orig");
		if(inputOrigin){
			inputDestination = document.getElementById("text-dest");
			// This button sets the origin to the user's current location.
			if(navigator.geolocation){
				btnUseGeolocation = document.createElement("button");
				btnUseGeolocation.textContent =
					"Use Current Location as Origin";
				btnUseGeolocation.addEventListener("click", function(event){
					event.preventDefault();
					navigator.geolocation.getCurrentPosition(locationCallback);
				});
				divPlaceFooter.appendChild(btnUseGeolocation);
			}
			// This button swaps the origin and destination.
			if(inputDestination){
				btnSwitchOrigDest = document.createElement("button");
				btnSwitchOrigDest.textContent = "Reverse";
				btnSwitchOrigDest.addEventListener("click", function(event){
					event.preventDefault();
					var temp = inputOrigin.value;
					inputOrigin.value = inputDestination.value;
					inputDestination.value = temp;
				});
				divPlaceFooter.appendChild(btnSwitchOrigDest);
			}
		}
	}
	// Check for the <DIV> after the time input.
	if(divUseNow){
		selectDay = document.getElementById("select_day");
		inputTimeWhen = document.getElementById("time_when");
		if(selectDay && inputTimeWhen){
			// This button sets the "day" field to the current of the week and
			// the "when" field to the current time.
			btnNow = document.createElement("button");
			btnNow.textContent = "Now";
			btnNow.addEventListener("click", function(event){
				event.preventDefault();
				var i,
					now = new Date(),
					divsCustomSelect = 
						selectDay.parentElement.
						getElementsByClassName("select-items");
				// If custom-select.js has replaced the select element, update
				// its replacement. Otherwise, select the day of the week in
				// the select element.
				if(divsCustomSelect){
					divsCustomSelect[0].children[
						Math.min(
							now.getDay(),
							divsCustomSelect[0].children.length - 1
						)
					].click()
				}else{
					select_day.children[now.getDay()].selected = true;
				}
				// Set the value of the input[type=time] element.
				time_when.value =
					padLeft(now.getHours().toString(), 2, '0') + ':' +
					padLeft(now.getMinutes().toString(), 2, '0');
			});
			divUseNow.appendChild(btnNow);
		}
	}
	// Add autocompletion to the origin and destination inputs.
	enableLocationAutocomplete();
});
