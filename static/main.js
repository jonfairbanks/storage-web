
const CURL = window.curl;
const IOTA = window.IOTA;
const MAX_TRYTES = 2187;
const oldLog = console.log;

// Keeping track of proofs of work done
let pows = 0;

// Keeping track of proofs of work to be done
let totalPows = 0;

// Generate a new seed
let seed = createSeed();

let iota = new IOTA({
  host: 'http://iota.bitfinex.com',
  port: 80,
});

CURL.overrideAttachToTangle(iota.api);

/**
 * A proxy for the log to track proof of work done by curl.lib.js
 * UGLY HACK WARNING
 * @param {Object} msg 
 */
function logProxy(msg) {
  if (msg.includes('got PoW!')) {
    pows += 1;
    makeProgress((100 * (pows / totalPows)).toFixed(2));
  }

  oldLog(msg);
}
window.console.log = logProxy;

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
  if (value <= 100) {
    $('.progress-bar').css('width', value + '%').text(value + '%');
    $('.bg').css('width', (100 - value) + '%').text('');
  }
}

/**
 * @return {String} a new address from the given session seed
 */
function generateAddress() {
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
  loadFile().then(function(obj) {
    generateAddress(seed).then(function(address) {
      let tx = createTransactions(obj.buffer, obj.name, address);
      totalPows = tx.length;
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
