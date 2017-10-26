
const IOTA = window.IOTA;
const curl = window.curl;
curl.init();

const MAX_TRYTES = 2187;

// Keeping track of proofs of work done
let pows = 0;

// Keeping track of proofs of work to be done
let totalPows = 0;

// Generate a new seed
let seed = createSeed();

let iota = new IOTA({
  provider: 'http://node.lukaseder.de:14265',
});


override = true;

const MAX_TIMESTAMP_VALUE = (Math.pow(3, 27) - 1) / 2; // from curl.min.js

const localAttachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
  const ccurlHashing = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {
    $('.progress-bar').text('Starting proof of work');
    const iotaObj = iota;
    // inputValidator: Check if correct hash
    if (!iotaObj.valid.isHash(trunkTransaction)) {
      return callback(new Error('Invalid trunkTransaction'));
    }
    // inputValidator: Check if correct hash
    if (!iotaObj.valid.isHash(branchTransaction)) {
      return callback(new Error('Invalid branchTransaction'));
    }
    // inputValidator: Check if int
    if (!iotaObj.valid.isValue(minWeightMagnitude)) {
      return callback(new Error('Invalid minWeightMagnitude'));
    }
    let finalBundleTrytes = [];
    let previousTxHash;
    let i = 0;
    function loopTrytes() {
      getBundleTrytes(trytes[i], function(error) {
        if (error) {
          return callback(error);
        } else {
          i++;
          if (i < trytes.length) {
            loopTrytes();
          } else {
            // reverse the order so that it's ascending from currentIndex
            return callback(null, finalBundleTrytes.reverse());
          }
        }
      });
    }
    function getBundleTrytes(thisTrytes, callback) {
      // PROCESS LOGIC:
      // Start with last index transaction
      // Assign it the trunk / branch which the user has supplied
      // IF there is a bundle, chain  the bundle transactions via
      // trunkTransaction together
      let txObject = iotaObj.utils.transactionObject(thisTrytes);
      txObject.tag = txObject.obsoleteTag;
      txObject.attachmentTimestamp = Date.now();
      txObject.attachmentTimestampLowerBound = 0;
      txObject.attachmentTimestampUpperBound = MAX_TIMESTAMP_VALUE;
      // If this is the first transaction, to be processed
      // Make sure that it's the last in the bundle and then
      // assign it the supplied trunk and branch transactions
      if (!previousTxHash) {
        // Check if last transaction in the bundle
        if (txObject.lastIndex !== txObject.currentIndex) {
          return callback(new Error('Wrong bundle order. The bundle should be ordered in descending order from currentIndex'));
        }
        txObject.trunkTransaction = trunkTransaction;
        txObject.branchTransaction = branchTransaction;
      } else {
        // Chain the bundle together via the trunkTransaction (previous tx in the bundle)
        // Assign the supplied trunkTransaciton as branchTransaction
        txObject.trunkTransaction = previousTxHash;
        txObject.branchTransaction = trunkTransaction;
      }
      let newTrytes = iotaObj.utils.transactionTrytes(txObject);



      curl.pow({trytes: newTrytes, minWeight: minWeightMagnitude}).then(function(nonce) {
        pows +=1;
        makeProgress((100 * (pows / totalPows)).toFixed(2));
        let returnedTrytes = newTrytes.substr(0, 2673-81).concat(nonce);
        let newTxObject= iotaObj.utils.transactionObject(returnedTrytes);
        // Assign the previousTxHash to this tx
        let txHash = newTxObject.hash;
        previousTxHash = txHash;
        finalBundleTrytes.push(returnedTrytes);
        callback(null);
      }).catch(callback);
    }
    loopTrytes();
  };
  ccurlHashing(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, function(error, success) {
    if (error) {
      throw new Error(error);
    }
    if (callback) {
      return callback(error, success);
    } else {
      return success;
    }
  });
};
console.log('overrdide attach to tangle');
// using this because of bug with using curl.overrideAttachToTangle()
iota.api.attachToTangle = localAttachToTangle;


$(document).ready(function() {
  $('#copy').on('click', function() {
    $('#result').select();
    document.execCommand('copy');
  });
  $('#uploadBtn').on('change', function() {
    let file = document.getElementById('uploadBtn').files[0];
    if (file) {
      $('#filename').val(file.name);
      $('#clear').toggle();
      $('#upload').toggle();
      $('#select').toggle();
    }
  });
  $('#clear').on('click', function() {
    $('#filename').val('');
    $('#uploadBtn').val('');
    $('#clear').toggle();
    $('#upload').toggle();
    $('#select').toggle();
  });
  $('#upload').on('click', function() {
    $('#clear').addClass('disabled');
    $('#upload').addClass('disabled');
    $('#progress-field').toggle();
    try {
      storeDataInTangle();
    } catch (error) {
      $('#progress-field').toggle();
      $('#error').html(error);
      $('#error_panel').toggle();
    }
  });
});

/**
 * Displays the result link
 * @param {String} result the bundle hash to display
 */
function displayResult(result, markdown) {
  $('#progress-field').toggle();

  // Robust?
  if (markdown) {
    $('#result').val(document.location.href+'view/?id=' + result);
  } else {
    $('#result').val(document.location.href+'download/?id=' + result);
  }
  $('#result_field').toggle();
}

/**
 * Update progress bar when progress is made
 * @param {Number} value 
 */
function makeProgress(value) {
  $('.progress-bar').text('aaa');
  if (value <= 100) {
    $('.progress-bar').css('width', value + '%').text(value + '%');
    $('.bg').css('width', (100 - value) + '%').text('');
  }
}

/**
 * @return {String} a new address from the given session seed
 */
function generateAddress() {
  $('.progress-bar').text('Generating Address');
  console.log('generate address');
  return new Promise(function(resolve, reject) {
    iota.api.getNewAddress(seed, {}, function(error, address) {
      if (error) {
        reject(error);
      } else {
        resolve(address);
      }
    });
  });
}

/**
 * @return {String} a randomly generated seed
 */
function createSeed() {
  let text = '';
  const alphabet = '9ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < 81; i++) {
    text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return text;
};

/**
 * sends an array of transactions
 * @param {Array.<IOTA_TRANSACTIONS>} txs transaction array
 * @param {String} seed seed from which to send
 * @return {Promise.<Object>}
 */
function sendTransactions(txs, seed) {
  console.log('sending tx');
  return new Promise(function(resolve, reject) {
    iota.api.sendTransfer(seed, 4, 14, txs, function(error, transaction) {
      if (error) {
        reject(error);
      } else {
        resolve(transaction[0].bundle);
      }
    });
  });
}

/**
 * Stores the file in the tangle
 */
function storeDataInTangle() {
  console.log('store in tangle');
  loadFile().then(function(obj) {
    generateAddress(seed).then(function(address) {
      let tx = createTransactions(obj.buffer, obj.name, address);
      totalPows = tx.length;
      $('.progress-bar').text('Preparing Transactions');

      sendTransactions(tx, seed).then(function(result) {
        totalPows = 0;
        pows = 0;
        displayResult(result, obj.name.endsWith('.md'));
        makeProgress(0);
        console.log(result);
      });
    });
  });
}
/**
 * Returns the dataURI of the file to upload
 * @return {Promise.<dataURI>}
 */
function loadFile() {
  return new Promise(function(resolve, reject) {
    let reader = new FileReader();
    let file = document.querySelector('input[type=file]').files[0];
    reader.readAsDataURL(file);
    reader.onload = function() {
      resolve({buffer: reader.result, name: file.name});
    };
    reader.onerror = function(error) {
      reject(error);
    };
  });
}

/**
 * Converts a data URI string to trytes
 * @param {String} dataURI 
 * @return {String} a string of trytes
 */
function dataURIToTrytes(dataURI) {
  return iota.utils.toTrytes(dataURI);
}

/**
 * Splits a tryte string into chunks of MAX_TRYTE size
 * @param {String} trytes 
 * @return {Array.<String>} array of tryte chunks
 */
function makeChunks(trytes) {
  return trytes.match(new RegExp('.{1,' + MAX_TRYTES + '}', 'g'));
}

/**
 * create an Array of IOTA transactions from a given dataURI and filename
 * @param {String} dataURI dataURI
 * @param {String} filename 
 * @param {String} address 
 * @return {Array.<Object>} array of transaction objects
 */
function createTransactions(dataURI, filename, address) {
  let trytes = dataURIToTrytes(filename + ',' + dataURI);
  if (!trytes) {
    throw new Error('Invalid filename?');
  }
  let chunks = makeChunks(trytes);
  return chunks.map(function(chunk) {
    return {
      'address': address,
      'value': 0,
      'message': chunk,
      'tag': 'IOTASTORE',
    };
  });
}
