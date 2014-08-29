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
	functionDefinition: /^define ([^ ]+) ([^\(]+)\(([^\)]*)\)([^{]*)\{/,
	assignment: /^\s*([^ ]+) = ([^\n]+)/,
	
	instructionRegexs: {
		add: /add (nuw )?(nsw )?([^ ]+) ([^,]+), ([^\n]+)/,
		ret: /ret (void|([^ ]+) ([^\n]+))/,
		alloca: /alloca (inalloca )?([^ ,\n]+)(, ([^ ]+) \d+)?(, align \d+)/
	}
};

var isGlobal = true;

var functionTemplate = {
	isGlobal: false,
	name: "",
	returnType: "",
	arguments: [],
	localVariables: {},
	stackSize: 0,
};

var globals = {};

var currentFunction = {};

var output = [];

var i;

for(i = 0; i < input.length; ++i) {
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
				var args = argString.split(',');
								
				for(var a = 0; a < args.length; ++a) {
					var type_name = args[a].trim().split(' ');
					
					currentFunction.arguments.push({
						name: type_name[1],
						type: type_name[0]
					});
				}
			}
			
			currentFunction.stackSize = 0;
			
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
					evaluateExpression(globals, assign[1], assign[2]);
				} else if(assign[1][0] == "%") {									
					evaluateExpression(currentFunction.localVariables, assign[1], assign[2]);
					
					console.log(assign[1]);
					console.log(currentFunction.localVariables);
					
					
				}
			} else {
				evaluateInstruction(input[i]);
				
				// standard instruction
			}
		}
	}
}

// TODO: figure out how to do something somewhat useful with this

function evaluateExpression(destMap, destName, expression, func) {
	console.log("Expression: "+expression);
	
	var toPush = "";
	
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
			
			toPush = "A0";
			
			break;
		}
	case "alloca":
		{
			var inalloca = match[1] == "inalloca ";
			var t = match[2];
			var ty = match[3] || match[2];
			var numElements = match[4] || 1;
			var alignment = match[5] || 1;
			
			output.push("ALC -1");
		}
	}
		
	destMap[destName] = currentFunction.stackSize++;
		
	if(toPush.length) {
		output.push("PUSH "+toPush);
	}
}

function evaluateInstruction(expression) {
	var instruction = expression.trim().split(' ')[0];
		
	if(!regexs.instructionRegexs[instruction]) {
		console.log("Unknown instruction: "+instruction);
		return;
	}
	
	var match = expression.match(regexs.instructionRegexs[instruction]);
	
	switch(instruction) {
	case "ret":
		{
			console.log("ret instruction");
			
			if(match[1] == "void") {
				output.push("RET NONE");
			} else {
				console.log(match[3]);
				
				loadPrimitive(0, match[3]);
				output.push("RET A0");
			}
			
			break;
		}
	}
}

function loadPrimitive(addressRegister, value) {
	console.log("Loading primitive "+value+" to A"+addressRegister);
	
	if(value[0] == "%") {
		// local variable
				
		// first check the arguments for the source
		var args = currentFunction.arguments;
		for(var i = 0; i < args.length; ++i) {
			if(args[i].name == value) {
				output.push("CAG A"+addressRegister+", [sp-"+ ( (args.length-i) - currentFunction.stackSize)+"]");
				return;
			}
		}
				
		// next check the local variables
		if(currentFunction.localVariables[value] != undefined) {
			output.push("CAG A"+addressRegister+", [sp-"+(currentFunction.stackSize - currentFunction.localVariables[value])+"]");
			return;
		}
		
		console.log("Unknown variable "+value);
	} else {
		// numeric
		
		// first create a virtual register
		output.push("CAG A"+addressRegister+", "+ (addressRegister + 0)); // TODO: virtual register offset
		
		// next, populate it
		output.push("LOAD A"+addressRegister+", "+value);
	}
	
}

console.log(output.join('\n'));