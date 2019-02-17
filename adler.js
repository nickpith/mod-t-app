const adler32 = require('adler-32');
// const adler32 = require('adler32');
const fs = require('fs');
 
const fileBuffer = fs.readFileSync('singlewall.gcode');

// let checksum = adler32.str(fileBuffer, 0);
// if (checksum < 0) {
//   checksum += Math.pow(2, 32);
// }
// console.log(checksum.toString(16));

// checksum = adler32.bstr(fileBuffer, 0);
// if (checksum < 0) {
//   checksum += Math.pow(2, 32);
// }
// console.log(checksum.toString(16));

let checksum = adler32.buf(fileBuffer, 0);
// let checksum = adler32.sum(fileBuffer, 1);
if (checksum < 0) {
  checksum += Math.pow(2, 32);
}
// console.log(checksum.toString(16));
console.log(`filesize: ${fileBuffer.length}`);
console.log(`adler32: ${checksum}`);
