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
	functionDefinition: /^define ([^ ]+) ([^\(]+)\(([^\)]*)\)([^{]*){/,
	assignment: /^\s*([^ ]+) = ([^\n]+)/,
	
	instructionRegexs: {
		add: /add (nuw )?(nsw )?([^ ]+) ([^,]+), ([^\n]+)/
	}
}

var isGlobal = true;

var functionTemplate = {
	isGlobal: false,
	name: "",
	returnType: "",
	arguments: [],
	localVariables: {},
	stackSize: 0
}

var globals = {};

var currentFunction = {};

var output = [];

for(var i = 0; i < input.length; ++i) {
	if(isGlobal) {
		if(regexs.functionDefinition.test(input[i])) {
			isGlobal = false;
			
			var match = input[i].match(regexs.functionDefinition);
			
			currentFunction = functionTemplate;
			
			var f_name = match[2];
			if(f_name[0] == "@") {
				currentFunction.isGlobal = true;
				f_name = f_name.slice(1);
			}
			
			currentFunction.name = f_name;
			currentFunction.returnType = match[1];
			
			var argString = match[3];
			
			currentFunction.arguments = []; // not sure what the issue was, but it seems to make node happy
			
			if(argString.length) { // ensuring argument length fixes many, many potential bugs down the line
				var arguments = argString.split(',');
				
				console.log(arguments);
				
				for(var a = 0; a < arguments.length; ++a) {
					var type_name = arguments[a].trim().split(' ');
					
					currentFunction.arguments.push({
						name: type_name[1],
						type: type_name[0]
					});
				}
			}
			
			output.push(currentFunction.name+":");
			
			console.log("Function definition: "+input[i]);
			console.log(currentFunction);
		}
	} else {
		if(input[i] == "}") {
			isGlobal = true;
		} else {
			if(regexs.assignment.test(input[i])) {
				// assignment instruction
				var assign = input[i].match(regexs.assignment);
				console.log(assign[1]);
				console.log(assign[2]);
				
				if(assign[1][0] == "@") {
					evaluateExpression(globals[assign[1].slice(1)], assign[2]);
				} else if(assign[1][0] == "%") {
					evaluateExpression(currentFunction.localVariables[assign[1].slice(1)], assign[2]);
					
				}
			} else {
				console.log(input[i]);
				// standard instruction
			}
		}
	}
}

function evaluateExpression(dest, expression) {
	console.log("Dest: "+dest);
	console.log("Expression: "+expression);
	
	var instruction = expression.split(' ')[0];
	
	if(!regexs.instructionRegexs[instruction]) {
		console.log("Unknown instruction: "+instruction);
		return;
	}
	
	var match = expression.match(regexs.instructionRegexs[instruction]);
	
	switch(instruction) {
	case "add":
		{
			var nuw = match[1] == "nuw ";
			var nsw = match[2] == "nsw ";
			var t = match[3];
			var a = match[4];
			var b = match[5];
			
			loadPrimitive(0, a); // TODO: dynamically allocate virtual registers
			loadPrimitive(1, b); // TODO pt 2: add more address registers for optimization
			output.push("ADD A0, A1"); 
			
			break;
		}
	}
	
	console.log(match);
	
	return 0;
}

function loadPrimitive(addressRegister, value) {
	console.log("Loading primitive "+value+" to A"+addressRegister);
	
	if(value[0] == "%") {
		// local variable
				
		// first check the arguments for the source
		var args = currentFunction.arguments;
		for(var i = 0; i < args.length; ++i) {
			if(args[i].name == value) {
				output.push("CAG A"+addressRegister+", [sp-"+(args.length-i)+"]");
			}
		}
	} else {
		// numeric
		
		// first create a virtual register
		output.push("CAG A"+addressRegister+", "+ (addressRegister + 0)); // TODO: virtual register offset
		
		// next, populate it
		output.push("LOAD A"+addressRegister+", "+value);
	}
	
}

console.log(output.join('\n'));