var fs = require('fs');
var source = fs.readFileSync(process.argv[2]).toString().split("\n");
var entrypoint = parseInt(process.argv[3]) || 0;

var regexs = {
	noOperand: /^\s*([^\n\s;]+)/,
	singleOperand: /^\s*([^ ]+) ([^\n\s;]+)/,
	dualOperand: /^\s*([^ ]+) ([^,]+), ([^\n\s;]+)/,
	label: /^\s*([^:]+):/,
	inlineMathAddress: /\[([^\+\-]+)(\+|\-)(\d+)\]/
}

var addressRegister = {
	"A0": 0,
	"A1": 1
}

var arithmeticInstructions = {
	"ADD" : 13,
	"SUB" : 14,
	"MUL" : 15,
	"DIV" : 16
}

var basicBranch = {
	"BRZ": 18,
	"BRS" : 19
}

function isImmediate(potential) {
	return potential[0] == "#";
}

function parseImmediate(imm) {
	return imm[0] == "#" ? imm.slice(1) : 0;
}

function parseAddress(addr) {
	return addr[0] == "$" ? parseInt(addr.slice(1), 16) : 0;
}

var instructions = [];

var labels = {};

var programCounter = entrypoint;

for(var i = 0; i < source.length; ++i) {
	var line = source[i];
	
	if(regexs.label.test(line)) {		
		labels[line.match(regexs.label)[1]] = programCounter;
	} else if(regexs.dualOperand.test(line)) {
		var match = line.match(regexs.dualOperand);
				
		if(match[1] == "CAG") {
			programCounter += 2;
		} else {
			programCounter += 3;
		}
		
		instructions = instructions.concat(match.slice(1));
	} else if(regexs.singleOperand.test(line)) {
		programCounter += 2;
		instructions = instructions.concat(line.match(regexs.singleOperand).slice(1));
	} else if(regexs.noOperand.test(line)) {
		programCounter++;
		instructions = instructions.concat(line.match(regexs.noOperand).slice(1));
	}
}

var output = [];

for(i = 0; i < instructions.length; ++i) {
	if(instructions[i] == "CAG") {
		if(instructions[i+2][0] == "$") {
			output = output.concat([0 + addressRegister[instructions[i+1]], parseInt(instructions[i+2].slice(1), 16)]);
			i += 2;
		} else if(regexs.inlineMathAddress.test(instructions[i+2])) {
			var imath = instructions[i+2].match(regexs.inlineMathAddress);
			
			if(imath[1] == "sp") {
				console.log("SP Math");
				output = output.concat([2 + addressRegister[instructions[i+1]], imath[3] * (imath[2] == '+' ? 1 : -1)]);
				i += 2;
			}
			
			console.log(imath);
		}
	} else if(instructions[i] == "PUSH") {
		if(isImmediate(instructions[i+1])) {
			output = output.concat([8, parseImmediate(instructions[++i])]);
		} else {
			output = output.concat([9, addressRegister[instructions[++i]]]);
		}
	} else if(instructions[i] == "POP") {
		output = output.concat([10, addressRegister[instructions[++i]]]);
	} else if(instructions[i] == "LOAD") {
		if(isImmediate(instructions[i+2])) {
			output = output.concat([11, addressRegister[instructions[++i]], parseImmediate(instructions[++i])]);
		} else {
			output = output.concat([12, addressRegister[instructions[++i]], addressRegister[instructions[++i]]]);
		}
	} else if(instructions[i] == "JMP") {
		output = output.concat([17, labels[instructions[++i]]]);
	} else if(basicBranch[instructions[i]]) {
		output = output.concat([basicBranch[instructions[i]], labels[instructions[++i]], addressRegister[instructions[++i]]]);
	} else if(arithmeticInstructions[instructions[i]]) {
		output = output.concat([arithmeticInstructions[instructions[i]], addressRegister[instructions[++i]], addressRegister[instructions[++i]]]);
	} else if(instructions[i] == "HLT") {
		output = output.concat([20]);
	} else if(instructions[i] == "CALL") {
		output = output.concat([21, labels[instructions[++i]]]);
	} else if(instructions[i] == "RET") {
		if(instructions[i+1] == "NONE") {
			output = output.concat([22]);
			++i;
		} else if(isImmediate(instructions[i+1])) {
			output = output.concat([23, parseImmediate(instructions[++i])]);
		} else {
			output = output.concat([24, addressRegister[instructions[++i]]]);
		}
	} else if(instructions[i] == "OUT") {
		if(isImmediate(instructions[i+1])) {
			output = output.concat([25, parseImmediate(instructions[++i])]);
		} else {
			output = output.concat([26, addressRegister[instructions[++i]]]);
		}
	} else if(instructions[i] == "BIN") {
		output = output.concat([27, labels[instructions[++i]]]);
	} else if(instructions[i] == "IN") {
		output = output.concat([28, addressRegister[instructions[++i]]]);
	} else {
		console.log("Unknown instruction: "+instructions[i]);
	}
}

console.log(output.join('\n'));