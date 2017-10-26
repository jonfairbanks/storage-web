

let iota = new IOTA({
  provider: 'http://node.lukaseder.de:14265',
});

/**
 * Given a bundle hash it will download the data stored in the transactions
 * @param {string} bundle bundle hash
 */
function downloadDataFromTangle(bundle) {
  iota.api.findTransactionObjects({bundles: [bundle]}, function(error, result) {
    const resultSorted = result.sort(function(a, b) {
      return a.currentIndex - b.currentIndex;
    });
    const tryteChunks = resultSorted.map(function(tx) {
      return tx.signatureMessageFragment;
    });

    // TODO: split and merge is inefficent, change that approach
    let fileChunks = tryteToBase64(tryteChunks).split(',');
    
    download(fileChunks[1]+ ',' +fileChunks[2], fileChunks[0]);
  });
}


/**
 * //TODO: refactor see downloadDataFromTangle
 * Given a bundle hash it will download the markdown stored in the transactions
 * @param {string} bundle bundle hash
 * @return {Promise.<String>} makdown string
 */
function downloadMarkdownFromTangle(bundle) {
  return new Promise(function(resolve, reject) {
    iota.api.findTransactionObjects({bundles: [bundle]},
      function(error, result) {
      const resultSorted = result.sort(function(a, b) {
        return a.currentIndex - b.currentIndex;
      });
      const tryteChunks = resultSorted.map(function(tx) {
        return tx.signatureMessageFragment;
      });
      // TODO: split and merge is inefficent, change that approach
      let fileChunks = tryteToBase64(tryteChunks).split(',');
      resolve(atob(fileChunks[2]));
    });
  });
}
/**
 * Converts an array of tryte chunks to Base64 string
 * (the returned string is expected to have the format:
 * <FILENAME>,<MIMESTRING>,<base64Data>
 * @param {Array.<String>} tryteChunks array of tryte strings
 * @return {String} String in the format as mentioned above
 */
function tryteToBase64(tryteChunks) {
  const regExp = new RegExp('9+$');

  // remove the trailing tryte padding 
  tryteChunks[tryteChunks.length-1] =
    tryteChunks[tryteChunks.length-1].replace(regExp, '');

  return iota.utils.fromTrytes(tryteChunks.join(''));
}

/**
 * Starts a download from the browser
 * @param {dataURI} file 
 * @param {String} name 
 */
function download(file, name) {
  let blob = dataURItoBlob(file);
  let a = window.document.createElement('a');
  a.href = window.URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


const BASE64_MARKER = ';base64,';

/**
 * Converts a dataURI to a Blob
 * @param {dataURI} dataURI 
 * @return {Blob}
 */
function dataURItoBlob(dataURI) {
  // TODO: cleanup
  let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  let base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
  let base64 = dataURI.substring(base64Index);
  let raw = window.atob(base64);
  let rawLength = raw.length;
  let array = new Uint8Array(new ArrayBuffer(rawLength));

  for (i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }

  return new Blob([array], {type: mimeString});
}

