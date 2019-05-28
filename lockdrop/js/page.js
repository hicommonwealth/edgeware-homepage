let provider, web3;
const MAINNET_LOCKDROP = '0x1b75b90e60070d37cfa9d87affd124bb345bf70a';
const ROPSTEN_LOCKDROP = '0x111ee804560787E0bFC1898ed79DAe24F2457a04';
const LOCKDROP_ABI = JSON.stringify([{"constant":true,"inputs":[],"name":"LOCK_START_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_END_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_DROP_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_origin","type":"address"},{"name":"_nonce","type":"uint32"}],"name":"addressFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":false,"inputs":[{"name":"contractAddr","type":"address"},{"name":"nonce","type":"uint32"},{"name":"edgewareAddr","type":"bytes"}],"name":"signal","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"term","type":"uint8"},{"name":"edgewareAddr","type":"bytes"},{"name":"isValidator","type":"bool"}],"name":"lock","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[{"name":"startTime","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"eth","type":"uint256"},{"indexed":false,"name":"lockAddr","type":"address"},{"indexed":false,"name":"term","type":"uint8"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"isValidator","type":"bool"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"contractAddr","type":"address"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Signaled","type":"event"}]);

$(function() {
  $('.publickey-input').on('blur', function(e) {
    if (e.target.value !== '' && e.target.value.length !== 64 && e.target.value.length !== 66) {
      alert('Please enter a valid 32-byte public key with or without 0x prefix');
    }
  });

  $('input[name="network"]').change(function(e) {
    let network = $('input[name="network"]:checked').val();
    if (network === 'mainnet') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
      $('#ETHERSCAN_LINK').attr('href', `https://etherscan.io/address/${MAINNET_LOCKDROP}`);
    } else if (network === 'ropsten') {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(ROPSTEN_LOCKDROP);
      $('#ETHERSCAN_LINK').attr('href', `https://etherscan.io/address/${ROPSTEN_LOCKDROP}`);
    } else {
      $('#LOCKDROP_CONTRACT_ADDRESS').val(MAINNET_LOCKDROP);
      $('#ETHERSCAN_LINK').attr('href', `https://etherscan.io/address/${MAINNET_LOCKDROP}`);
    }
  });

  $('input[name="locktime"]').change(function(e) {
    var val = $('input[name="locktime"]:checked').val();
    if (val === 'signal') {
      $('.body-container').removeClass('locking');
      $('.body-container').addClass('signaling');
    } else if (val.startsWith('lock')) {
      $('.body-container').addClass('locking');
      $('.body-container').removeClass('signaling');
    } else {
      $('.body-container').removeClass('locking');
      $('.body-container').removeClass('signaling');
    }
    $('input[name="validator"]').prop('checked', false);
    $('input[name="validator"]').trigger('change');
  });

  $('input[name="validator"]').change(function(e) {
    var val = $('input[name="validator"]:checked').val();
    if (val === 'yes') {
      $('#EDGEWARE_PUBLIC_KEY2').fadeIn(100);
      $('#EDGEWARE_PUBLIC_KEY3').fadeIn(100);
      $('.publickey-explanation').fadeIn(100);
    } else {
      $('#EDGEWARE_PUBLIC_KEY2').val('').hide();
      $('#EDGEWARE_PUBLIC_KEY3').val('').hide();
      $('.publickey-explanation').hide();
    }
  });

  $('button.injectedWeb3').click(async function() {
    if (!getPublicKey()) {
      return;
    }
    // Setup ethereum connection and web3 provider
    await enableInjectedWeb3EthereumConnection();
    setupInjectedWeb3Provider();

    // Grab form data
    let { returnTransaction, params, failure, reason } = await configureTransaction(true);
    if (failure) {
      alert(reason);
      return;
    }
    $('.participation-option').hide();
    $('.participation-option.injectedWeb3').slideDown(100);
    $('.participation-option.injectedWeb3 .injectedWeb3-error').text('').hide();
    $('.participation-option.injectedWeb3 .injectedWeb3-success').text('').hide();
    // Send transaction if successfully configured transaction
    returnTransaction.send(params, function(err, txHash) {
      if (err) {
        console.log(err);
        $('.participation-option.injectedWeb3 .injectedWeb3-error').show()
          .text(err.message);
      } else {
        console.log(txHash);
        $('.participation-option.injectedWeb3 .injectedWeb3-success').show()
          .text('Success! Transaction submitted');
      }
    });
    $('html, body').animate({ scrollTop: $('.participation-options').position().top - 50 }, 500);
  });
  $('button.mycrypto').click(async function() {
    if (!getPublicKey()) {
      return;
    }
    setupInfuraWeb3Provider();
    let { returnTransaction, params, failure, reason, args } = await configureTransaction(false);
    if (failure) {
      alert(reason);
      return;
    }
    $('.participation-option').hide();
    $('.participation-option.mycrypto').slideDown(100);
    // Create arg string
    let myCryptoArgs = Object.keys(args).map((a, inx) => {
      if (inx == Object.keys(args).length - 1) {
        return `${a}: ${args[a]}`;
      } else {
        return `${a}: ${args[a]}\n`;
      }
    }).reduce((prev, curr) => {
      return prev.concat(curr);
    }, "");

    $('#LOCKDROP_MYCRYPTO_CONTRACT_ADDRESS').text($('#LOCKDROP_CONTRACT_ADDRESS').val());
    $('#LOCKDROP_MYCRYPTO_ABI').text(LOCKDROP_ABI);
    $('#LOCKDROP_MYCRYPTO_ARGUMENTS').text(myCryptoArgs);
    if ($('input[name=locktime]:checked').val() === 'signal') {
      $('#LOCKDROP_MYCRYPTO_VALUE').hide();
    } else {
      $('#LOCKDROP_MYCRYPTO_VALUE').show().text('Value: ' + $('#ETH_LOCK_AMOUNT').val());
    }
    $('html, body').animate({ scrollTop: $('.participation-options').position().top - 50 }, 500);
  });
  $('button.cli').click(function() {
    if (!getPublicKey()) {
      return;
    }
    $('.participation-option').hide();
    $('.participation-option.cli').slideDown(100);
    let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
    let edgewarePublicKey = getPublicKey();
    const dotenv = `# ETH config
ETH_PRIVATE_KEY=<ENTER_YOUR_PRIVATE_KEY_HEX_HERE>

# Node/provider config
INFURA_PATH=v3/<INSERT_INFURA_API_KEY_HERE>

# Lockdrop config
LOCKDROP_CONTRACT_ADDRESS=${lockdropContractAddress}

# Edgeware config
EDGEWARE_PUBLIC_KEY=${edgewarePublicKey}`;
    $('#LOCKDROP_DOTENV').text(dotenv);
    $('html, body').animate({ scrollTop: $('.participation-options').position().top - 50 }, 500);
  });

  $('button.commonwealth-ui').click(function() {
    $('.generate-option').hide();
    $('.generate-option.commonwealth-ui').slideDown(100);
  });

  $('button.rust').click(function() {
    $('.generate-option').hide();
    $('.generate-option.rust').slideDown(100);
  });
});

async function configureTransaction(isInjectedWeb3) {
  let failure = false;
  let returnTransaction, params, reason, args;

  let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
  let edgewarePublicKey = getPublicKey();

  let lockdropLocktimeFormValue = $('input[name=locktime]:checked').val();
  let validatorIntent = ($('input[name=validator]:checked').val() === 'yes') ? true : false;
  // Grab lockdrop JSON and instantiate contract
  const json = await $.getJSON('Lockdrop.json');
  const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
  // Switch on transaction type
  const signaling = (lockdropLocktimeFormValue === 'signal');
  if (!signaling) {
    let ethLockAmount = $('#ETH_LOCK_AMOUNT').val();
    if (isNaN(+ethLockAmount) || +ethLockAmount <= 0) {
      alert('Please enter a valid ETH amount!');
      return;
    }

    // Calculate lock term as enum values
    const lockdropLocktime = (lockdropLocktimeFormValue === 'lock3') ?
          0 : ((lockdropLocktimeFormValue === 'lock6') ?
               1 : 2);

    // Params are only needed for sending transactions directly i.e. from InjectedWeb3
    if (isInjectedWeb3) {
      const coinbaseAcct = await web3.eth.getCoinbase();
      params = {
        from: coinbaseAcct,
        value: web3.utils.toWei(ethLockAmount, 'ether'),
        gasLimit: 150000,
      };
    }
    returnTransaction = contract.methods.lock(lockdropLocktime, edgewarePublicKey, validatorIntent);
    args = {
      term: lockdropLocktime,
      edgewareAddr: edgewarePublicKey,
      isValidator: validatorIntent,
    };
  } else {
    if (isInjectedWeb3) {
      const coinbaseAcct = await web3.eth.getCoinbase();
      params = { from: coinbaseAcct, gasLimit: 150000 };
    }

    // FIXME: Create these inputs for signalers
    let signalingContractAddress = $('#SIGNALING_CONTRACT_ADDR').val();
    let signalingContractNonce = $('#SIGNALING_CONTRACT_NONCE').val();

    let res = validateSignalingContractAddress(signalingContractAddress, signalingContractNonce);
    if (!isInjectedWeb3 && res.failure) {
      return res;
    } else {
      signalingContractAddress = signalingContractAddress || params.from;
      signalingContractNonce = signalingContractNonce || 0;
    }

    returnTransaction = contract.methods.signal(signalingContractAddress, signalingContractNonce, edgewarePublicKey);
    args = {
      contractAddr: signalingContractAddress,
      nonce: signalingContractNonce,
      edgewareAddr: edgewarePublicKey,
    };
  }
  return { returnTransaction, params, failure, reason, args };
}


function isHex(inputString) {
  const re = /^(0x)?[0-9A-Fa-f]+$/g;
  const result = re.test(inputString);
  re.lastIndex = 0;
  return result;
}

function getPublicKey() {
  const locktime = $('input[name=locktime]:checked').val();
  if (!locktime) {
    alert('Select lock or signal');
    return;
  }
  const key1 = $('#EDGEWARE_PUBLIC_KEY1').val();
  const key2 = $('#EDGEWARE_PUBLIC_KEY2').val();
  const key3 = $('#EDGEWARE_PUBLIC_KEY3').val();
  const validator = $('input[name="validator"]:checked').val();
  if (!key1 || (key1.length !== 64 && key1.length !== 66) || !isHex(key1)) {
    alert('Please enter a valid 32-byte public key with or without 0x prefix');
    return;
  }
  if (validator === 'yes' &&
      (!key2 || (key2.length !== 64 && key2.length !== 66) || !isHex(key2))) {
    alert('(key 2) Please enter a valid 32-byte public key with or without 0x prefix');
    return;
  }
  if (validator == 'yes' &&
      (!key3 || (key3.length !== 64 && key3.length !== 66) || !isHex(key3))) {
    alert('(key 3) Please enter a valid 32-byte public key with or without 0x prefix');
    return;
  }
  if (validator == 'yes' && (key1 === key2 || key2 === key3 || key1 == key3)) {
    alert('Please enter unique public keys');
    return;
  }

  if (validator === 'yes') {
    return '0x' +
      (key1.length === 64 ? key1 : key1.slice(2)) +
      (key2.length === 64 ? key2 : key2.slice(2)) +
      (key3.length === 64 ? key3 : key3.slice(2));
  } else {
    return '0x' + (key1.length === 64 ? key1 : key1.slice(2));
  }
}

/**
 * Ensure that the contract address and nonce are properly formatted
 */
function validateSignalingContractAddress(contractAddress, nonce) {
  if (!contractAddress || !nonce) {
    return {
      failure: true,
      reason: 'Signaled address and nonce are required if you are using MyCrypto. Use 0 for the nonce if you are signaling the address you are sending from.',
    };
  }

  if (isNaN(nonce)) {
    return {
      failure: true,
      reason: 'Nonce must be an integer',
    };
  }

  if (contractAddress.indexOf('0x') > 0 && contractAddress.length !== 42) {
    return {
      failure: true,
      reason: 'Signaled address is not valid, it contains 0x but must be 20 bytes in length',
    };
  }

  if (contractAddress.indexOf('0x') === -1 && contractAddress.length !== 40) {
    return {
      failure: true,
      reason: 'Signaled address is not valid, it does not contain 0x nor is it 20 bytes',
    };
  }

  return { failure: false };
}

/**
 * Setup web3 provider using InjectedWeb3's injected providers
 */
function setupInjectedWeb3Provider() {
  // Setup web3 provider
  if (typeof window.ethereum !== 'undefined' || (typeof window.web3 !== 'undefined')) {
    // Web3 browser user detected. You can now use the provider.
    provider = window.ethereum || window.web3.currentProvider;
  }

  web3 = new window.Web3(provider);
}

/**
 * Setup web3 provider using Infura Public Gateway
 */
function setupInfuraWeb3Provider() {
  if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
  } else {
    // Set the provider you want from Web3.providers
    web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io'));
  }
}

/**
 * Enable connection between browser and InjectedWeb3
 */
async function enableInjectedWeb3EthereumConnection() {
  try {
    await ethereum.enable();
  } catch (error) {
    // Handle error. Likely the user rejected the login:
    alert('Could not find Web3 provider/Ethereum wallet');
  }
}
