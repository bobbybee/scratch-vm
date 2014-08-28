var o = "";

for(var i = 0; i < 255; ++i) {	
	if( 
			(i >= "A".charCodeAt() && i <= "Z".charCodeAt())
		||	(i >= "a".charCodeAt() && i <= "z".charCodeAt())
		||  (i >= "0".charCodeAt() && i <= "9".charCodeAt())
		||  (i >= 33 && i <= 47)
		||  (i >= 58 && i <= 64)
		||  (i >= 91 && i <= 126)
	) {
		o += String.fromCharCode(i);
	} else {
		o += ".";
	}
}

console.log(o);