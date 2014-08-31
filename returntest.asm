; equivalent C code
; void start() {
; 	put(letter(26));
; }
;
; int letter(int n) {
;	return n + 64;
; }

start:
PUSH A0
PUSH A1
PUSH #26
CALL letter
FRV A0
OUT A0
HLT

letter:
CAG A0, $FF
LOAD A0, #64
CAG A1, [sp+2]
ADD A0, A1
RET A0, #1