/*
	generate_memory.js
	utillity to generates a memory table to be imported into Scratch
	usage: node generate_memory.js output.rom size program.bin entrypoint
*/

var fs = require('fs');

var memory = new Array(parseInt(process.argv[3])+1).join('0').split('');

var program = fs.readFileSync(process.argv[4]).toString().split('\n');

var entrypoint = parseInt(process.argv[5]);

memory = memory.slice(0, entrypoint).concat(program).concat(memory.slice(1+program.length+entrypoint));

fs.writeFileSync(process.argv[2], memory.join("\n"), "utf8");