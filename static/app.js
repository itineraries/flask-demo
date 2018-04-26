// ==ClosureCompiler==
// @output_file_name app.min.js
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==

String.prototype.padLeft = function(length, padChar){
	var result = this;
	while(result.length < length){
		result = padChar + result;
	}
	return result;
}
window.addEventListener("load", function(){
	// Add the buttons in the last column.
	var btnSwitchOrigDest = document.createElement("button"),
		btnNow = document.createElement("button");
	// This button swaps the origin and destination.
	btnSwitchOrigDest.textContent = "Reverse";
	btnSwitchOrigDest.addEventListener("click", function(event){
		event.preventDefault();
		var input_orig = document.getElementById("text-orig"),
			input_dest = document.getElementById("text-dest"),
			temp = input_orig.value;
		input_orig.value = input_dest.value;
		input_dest.value = temp;
	});
	document.getElementById("switch-orig-dest").appendChild(btnSwitchOrigDest);
	// This button sets the "day" field to the current of the week and the
	// "when" field to the current time.
	btnNow.textContent = "Now";
	btnNow.addEventListener("click", function(event){
		event.preventDefault();
		var now = new Date(),
			select_day = document.getElementById("select_day"),
			time_when = document.getElementById("time_when");
		select_day.children[now.getDay()].selected = true;
		time_when.value =
			now.getHours().toString().padLeft(2, '0') + ':' +
			now.getMinutes().toString().padLeft(2, '0');
	});
	document.getElementById("use-now").appendChild(btnNow);
});