/*
	generate_json.js
	responsible for final pass of VM generation
	takes in an empty project folder name and a list of scripts
	outputs an updated project folder
*/

var fs = require("fs");

module.exports = function(folder, scripts) {
	var path = "./"+folder+"/project.json";
	
	var projJSON = JSON.parse(fs.readFileSync(path).toString());
	projJSON.children[0].scripts = scripts;
	
	fs.writeFileSync(path, JSON.stringify(projJSON), "utf8");
}