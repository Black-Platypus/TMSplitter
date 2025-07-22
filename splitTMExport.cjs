const fs = require('fs');
const util = require('util');
const path = require('path');
const readline = require('readline');

const srcFile = "F:/Downloads/tampermonkey-backup-chrome-2025-07-13T14-08-43-710Z.txt";
const outDir = "${srcPathNoExt}-${maxLength}"; // Supports: literal path | srcPathNoExt = Path and basename of source file | / = path separator | maxLength = maxPartLength
const outFileBase = "${srcFileNoExt}-${n}"; // Supports: literal string | srcFileNoExt = basename of source file | n = number in sequence
const alwaysIncludeSettings = false; // include exported settings in every chunk
const maxScriptsPerPart = 50;
const maxPartLength = 20*1024*1024;

const stringValues = {
	"/": path.sep,
	srcPath: path.dirname(srcFile),
	srcFile: path.basename(srcFile),
	maxLength: formatBytes(maxPartLength, 1, false)
};
stringValues.srcFileNoExt = stringValues.srcFile.replace(/\.[^\.]+$/, "");
// console.log(stringValues.srcFileNoExt);
stringValues.srcPathNoExt = path.join(stringValues.srcPath, stringValues.srcFileNoExt);

const _outDir = replaceValues(outDir);
const outPathBase = path.join(_outDir, replaceValues(outFileBase));

function replaceValues(str){
	let replaced = true;
	while(replaced){
		replaced = false;
		for(let k in stringValues){
			// console.log(k);
			str = str.replace("${"+k+"}", ()=>{
				replaced = true;
				return stringValues[k];
			});
		}
	}
	return str;
}

const allStr = fs.readFileSync(srcFile);
const data = JSON.parse(allStr);
// console.log(Buffer.byteLength(JSON.stringify(data)), Buffer.byteLength(allStr));

const baseObj = {created_by: data.created_by, version: data.version};

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

let toWrite = [];
let ix = 0;
let scriptIx = 0;
let scriptsTotal = data.scripts.length;
let lengthTotal = 0;
const safetyMax = 100;
function confirm(prompt){
	return new Promise(function(resolve, reject){
		rl.question(prompt + " [Y/n] ", async function(answer){
			if(/^(y(es)?)?$/i.test(answer)){
				resolve(true);
			}
			else if(/^n(o)?$/i.test(answer)){
				resolve(false);
			}
			else{
				resolve(await confirm(prompt));
			}
			rl.pause();
		});
	});
}
main();
async function main(){
	while(scriptIx<data.scripts.length && ix < safetyMax){
		// log("before:", obj);
		let obj = Object.assign({scripts: []}, baseObj);
		if(ix==0 || alwaysIncludeSettings)
			obj.settings = data.settings;
		// console.log(obj);
		let len = JSON.stringify(obj).length;
		// status(scriptIx, len, ix);
		if(len>=maxPartLength){
			toWrite.push(obj);
			ix++;
			continue;
		}
		for(let c = 0; c<maxScriptsPerPart; c++){
			if(scriptIx>=data.scripts.length)
				break;
			let s = data.scripts[scriptIx];
			let slen = byteLength(s);
			let newLen = len + slen + 3;
			status(scriptIx, len, ix, "Script #" + (scriptIx+1) + ":", formatBytes(slen));
			if(newLen > maxPartLength){
				if(obj.scripts.length<=0){
					console.warn("Warning: Single script causes chunk to exceed maximum size! (" + formatBytes(len+3) + ` + ${formatBytes(slen)} = ${formatBytes(len + 3 + slen)}\n\tPart #${ix+1} may be too large, but can't be split further.`);
					details(s);
					let haveSolution = false;
					// log(newLen, byteLength(s.requires), byteLength(s.storage));
					if(newLen - byteLength(s.requires)<=maxPartLength){
						let res = await confirm("Removing included 'requires' would bring it down to size. Would you like to remove them? ");
						if(res){
							delete s.requires;
							haveSolution = true;
						}
					}
					else if(newLen - byteLength(s.storage)<=maxPartLength){
						let res = await confirm("Removing included 'storage' would bring it down to size. Would you like to remove it? ");
						if(res){
							delete s.storage;
							haveSolution = true;
						}
					}
					else if(newLen - byteLength(s.requires) - byteLength(s.storage)<=maxPartLength){
						let res = await confirm("Removing included 'requires' and 'storage' would bring it down to size. Would you like to remove them? ");
						if(res){
							delete s.requires;
							delete s.storage;
							haveSolution = true;
						}
					}
					if(haveSolution){
						slen = byteLength(s);
						log("\tNew size is now", formatBytes(slen));
						newLen = len + slen + 3;
					}
					else
						log("\tCreating chunk that may be too large");
					len = newLen;
					lengthTotal+=slen;
					obj.scripts.push(s);
					scriptIx++;
				}
				break;
			}
			len = newLen;
			lengthTotal+=slen;
			// log("pushing");
			obj.scripts.push(s);
			scriptIx++;
		}
		// log("past for");
		toWrite.push(obj);
		ix++;
		// break;
	}
	const chunks = toWrite.length;
	log("Got data:", chunks, "chunks");
	const digits = Math.floor(Math.log10(chunks) + 1);
	let c = 1;
	fs.mkdirSync(_outDir, {recursive: true});
	log("Writing to:", _outDir);
	for(let chunk of toWrite){
		let fileName = outPathBase.replace("${n}", ("000" + c).slice(-digits)) + ".txt";
		log("Writing:", fileName);
		try{
			fs.writeFileSync(fileName, JSON.stringify(chunk));
		}
		catch(e){
			console.error("Error writing chunk #" + c + " (" + fileName + "):");
			console.error(e);
		}
		c++;
	}
	rl.close();
}


function formatBytes(int, digits=2, fixed=true){
	let suffix = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
	let ix = 0;
	while(int>1024){
		int /= 1024;
		ix++;
	}
	if(fixed)
		return int.toFixed(digits) + suffix[ix];
	const fact = 10**digits;
	return (Math.round(int*fact)/fact) + suffix[ix];
}

function status(scriptIx, len, ix, ...rest){
	console.log(`[${scriptIx+1}/${scriptsTotal}][${ix+1}] ~${formatBytes(len)} (~${formatBytes(lengthTotal)} total)`, ...rest);
}
function details(script){
	let sizes = {};
	for(let k in script){
		sizes[k] = {length: formatBytes(JSON.stringify(script[k]).length)};
	}
	console.log(script.name, "(" + script.uuid + ")");
	console.table(sizes);
}

function log(...args){
	console.log(...args);
}

function byteLength(o){
	if(typeof o != "string")
		o = JSON.stringify(o);
	return Buffer.byteLength(o);
}