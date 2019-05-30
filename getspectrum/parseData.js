module.exports = {
  parseTrace: function(base64) {
    let buff = new Buffer(base64, 'base64'); 
    var HEX = buff.toString('hex');
    const hexString = HEX.toUpperCase();
    var output = [];
    var i = 0; 
    while(i<hexString.length){
      let slicedHex = hexString.slice(i,i+2);
      output.push(parseInt(slicedHex, 16));
      i+=2;
    }
    return output;
  }
}
