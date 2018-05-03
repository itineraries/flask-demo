// ==ClosureCompiler==
// @output_file_name app.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

function padLeft(str, length, padChar){
	while(str.length < length){
		str = padChar + str;
	}
	return str;
}
function getNameOfFunction(func){
	if(func.name){
		return func.name;
	}
	var funcAsStr = func.toString();
	return funcAsStr.substring(9, funcAsStr.indexOf("("));
}
function googleMapsApiCallback(){}
window.addEventListener("load", function(){
	var inputOrigin, inputDestination, btnUseGeolocation, btnSwitchOrigDest,
		btnNow, selectDay, inputTimeWhen,
		divPlaceFooter = document.getElementById("place-footer"),
		divUseNow = document.getElementById("use-now"),
		inputGoogleMapsApiKey = document.getElementById("google_maps_api_key"),
		scriptGoogleMapsApi = document.createElement("script"),
		locationCallback = function(position){
			inputOrigin.value =
				position.coords.latitude + "," + position.coords.longitude;
		};
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
	if(inputGoogleMapsApiKey){
		scriptGoogleMapsApi.src = "https://maps.googleapis.com/maps/api/js?" +
			"key=" + encodeURIComponent(inputGoogleMapsApiKey.value) + "&" +
			"libraries=places&" +
			"callback=" + encodeURIComponent(
				getNameOfFunction(googleMapsApiCallback)
			);
        scriptGoogleMapsApi.async = true;
		scriptGoogleMapsApi.defer = true;
		document.body.appendChild(scriptGoogleMapsApi);
	}
});