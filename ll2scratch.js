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
var start = process.argv[3] ? (fs.readFileSync(process.argv[3]).toString()+"\n") : "";
var stdlib = process.argv[4] ? ("\n"+fs.readFileSync(process.argv[4]).toString()) : "";

var regexs = {
	functionDefinition: /^define ([^ ]+) ([^\(]+)\(([^\)]*)\)([^{]*)\{/,
	assignment: /^\s*([^ ]+) = ([^\n]+)/,
	
	typeRegexs: {
		primitive: /i(?:\d+)/
	},
	
	instructionRegexs: {
		add: /add (nuw )?(nsw )?([^ ]+) ([^,]+), ([^\n]+)/,
		ret: /ret (void|([^ ]+) ([^\n]+))/,
		alloca: /alloca (inalloca )?([^ ,\n]+)(, ([^ ]+) \d+)?(, align \d+)/,
		store: /store (volative )?([^ ]+) ([^,]+), ([^ ]+) ([^\n,]+)(, align ([^\n,]+))?/,
		call: /(tail |musttail )?call ([^ ]+) ([^\(]+)\(([^\)]+)\)/
	}
};

var isGlobal = true;

var functionTemplate = {
	isGlobal: false,
	name: "",
	returnType: "",
	arguments: [],
	localVariables: {},
	stackSize: 1,
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
			
			currentFunction.stackSize = 1 + currentFunction.arguments.length;
			
			output.push(currentFunction.name+":");
			
			console.log("Function definition: "+input[i]);
			console.log(currentFunction);
		}
	} else {
		if(input[i] == "}") {
			// end function			
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

function evaluateExpression(destMap, destName, expression) {
	console.log("Expression: "+expression);
	
	var toPush = "";
	
	var instruction = expression.trim().split(' ')[0];
	
	if(instruction == "tail" || instruction == "musttail" || instruction == "call") {
		finishExpression(destMap, destName, callInstruction(expression));
		return;
	}
	
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
		
	finishExpression(destMap, destName, toPush);
}

function finishExpression(destMap, destName, toPush) {
	destMap[destName] = Object.keys(destMap).length;
		
	if(toPush && toPush.length) {
		output.push("PUSH "+toPush);
	}
}

function evaluateInstruction(expression) {
	var instruction = expression.trim().split(' ')[0];
	
	if(instruction == "tail" || instruction == "musttail" || instruction == "call") {
		evaluateExpression({}, null, expression);
		return;
	}
		
	if(!regexs.instructionRegexs[instruction]) {
		console.log("Unknown instruction: "+instruction);
		return;
	}
	
	var match = expression.match(regexs.instructionRegexs[instruction]);
	
	switch(instruction) {
	case "ret":
		{
			console.log("ret instruction");
			
			var toDealloc = currentFunction.stackSize - 1;
			
			
			if(match[1] == "void") {
				if(toDealloc > 0) 
					output.push("ALC "+toDealloc);
				
				output.push("RET NONE");
			} else {
				console.log(match[3]);
				
				// TODO: optimize immediate returns to use opcode 23, which is much faster
				// TODO: non-primitive return types
				// TODO: find a safer way to do this than stack hacking
				
				loadPrimitive(0, match[3]);

				if(toDealloc > 0) 
					output.push("ALC "+toDealloc);
				
				
				output.push("RET A0");
			}
			
			break;
		}
	case "store":
		{
			console.log("store instruction");
			console.log(match);
			
			var volatile = match[1];
			var t1 = match[2];
			var val = match[3];
			var t2 = match[4];
			var addr = match[5];
			
			// TODO: fully suport store instruction-- it's complicated!
			// TODO: proper type support
			// TODO: support `store` at all
			
			//loadAddress(0, addr);
		}
	}
}

function callInstruction(expression) {
	var match = expression.match(regexs.instructionRegexs.call); 
	
	console.log(match);
	
	var returnType = match[2];
	var funcName = match[3];
	var argStr = match[4].split(',');
	
	var args = [];
	for(var i = 0; i < argStr.length; ++i) {
		var ps = argStr[i].trim().split(" ");
		
		args.push({
			type: ps[0],
			value: argStr[i].slice(ps[0].length+1).trim()
		});
	}
	
	console.log("Calling args!")
	console.log(args);
	
	// push "registers"
	// TODO: optimize me
	output.push("PUSH A0");
	output.push("PUSH A1");
	
	// push arguments backward
	for(i = args.length; i; --i) {
		pushVal(args[i-1].type, args[i-1].value);
	}
	
	// call
	
	output.push("CALL "+(funcName.slice(1)));
		
	// pop registers
	// TODO: optimize me
	output.push("POP A1"); // our saved A1
	output.push("POP A0");
	
	console.log(args);

	
	// TODO: support more versions of call
}

function loadPrimitive(addressRegister, value) {
	console.log("Loading primitive "+value+" to A"+addressRegister);
	
	if(value[0] == "%") {
		// local variable
				
		// first check the arguments for the source
		var args = currentFunction.arguments;
		for(var i = 0; i < args.length; ++i) {
			if(args[i].name == value) {
				var v = currentFunction.stackSize - i;
				
				output.push("CAG A"+addressRegister+", [sp"+ (v < 0 ? "" : "+") + v + "]");
				return;
			}
		}
				
		// next check the local variables
		if(currentFunction.localVariables[value] != undefined) {
			var v = currentFunction.arguments.length + currentFunction.localVariables[value] + 1;
			output.push("CAG A"+addressRegister+", [sp" + (v < 0 ? "" : "+") + v +"]");
			return;
		}
		
		console.log("Unknown variable "+value);
	} else {
		// numeric
		
		// first create a virtual register
		allocTempRegister(addressRegister);
		
		// next, populate it
		output.push("LOAD A"+addressRegister+", #"+value);
	}
	
}

function pushVal(type, value) {
	console.log("Pushing "+type+","+value);
	
	if(regexs.typeRegexs.primitive.test(type)) {
		// i* type
		loadPrimitive(0, value);
		output.push("PUSH A0");
	} else {
		console.log("Unknown type "+type);
	}
}

function allocTempRegister(addressRegister) {
	output.push("CAG A"+addressRegister+", $"+ (addressRegister + 1)); // TODO: virtual register offset
																		// TODO: convert to hex
}

console.log(start+output.join('\n')+stdlib);