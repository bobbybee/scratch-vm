scratch-vm
=========

scratch-vm is a generic virtual machine written in MIT Scratch. This git repository consists of its toolchain.

Components
=========

1. The assembler
The assembler is responsible for taking in assembler code and outputting scratch-vm bytecode.
2. The memory generator
The memory generator will input raw bytecode from the assembler and output a new-line seperated list of the new memory, to be imported by Scratch.
3. The LLVM->Scratch translator
The LLVM->Scratch translator will input LLVM bitcode, typically generated by clang, and output assembly.