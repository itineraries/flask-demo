// ==ClosureCompiler==
// @output_file_name app.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

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
}

function padLeft(str, length, padChar){
	while(str.length < length){
		str = padChar + str;
	}
	return str;
}
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
