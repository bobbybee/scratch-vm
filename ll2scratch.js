/*
ll2scratch.js
input llvm assembly, output scratch vm assembly
llvm assembly should be generated with clang

$ clang -S -emit-llvm sourcecode.c -o sourcecode.bc
$ node ll2scratch.js sourcecode
*/

var fs = require('fs');

var filename = process.argv[2];

var input = fs.readFileSync(filename+".bc").toString().split('\n');

var regexs = {
	functionDefinition: /^define ([^ ]+) ([^\(]+)\(([^\)]*)\)([^{]*){/
}

var isGlobal = true;

for(var i = 0; i < input.length; ++i) {
	if(isGlobal) {
		if(regexs.functionDefinition.test(input[i])) {
			isGlobal = false;
			console.log("Function definition: "+input[i]);
		}
	} else {
		if(input[i] == "}") {
			isGlobal = true;
		} else {
			console.log(input[i]);
		}
	}
}