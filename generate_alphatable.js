var o = "";

for(var i = 0; i < 255; ++i) {	
	if( 
			(i >= "A".charCodeAt() && i <= "Z".charCodeAt())
		||	(i >= "a".charCodeAt() && i <= "z".charCodeAt())
		||  (i >= "0".charCodeAt() && i <= "9".charCodeAt())
	) {
		o += String.fromCharCode(i);
	} else {
		o += "\\";
	}
}

console.log(o);