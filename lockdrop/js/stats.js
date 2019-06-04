let provider, web3, summary;
const MAINNET_LOCKDROP = '0x1b75b90e60070d37cfa9d87affd124bb345bf70a';
const LOCKDROP_ABI = JSON.stringify([{"constant":true,"inputs":[],"name":"LOCK_START_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_END_TIME","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"LOCK_DROP_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_origin","type":"address"},{"name":"_nonce","type":"uint32"}],"name":"addressFrom","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"pure","type":"function"},{"constant":false,"inputs":[{"name":"contractAddr","type":"address"},{"name":"nonce","type":"uint32"},{"name":"edgewareAddr","type":"bytes"}],"name":"signal","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"term","type":"uint8"},{"name":"edgewareAddr","type":"bytes"},{"name":"isValidator","type":"bool"}],"name":"lock","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"inputs":[{"name":"startTime","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":false,"name":"eth","type":"uint256"},{"indexed":false,"name":"lockAddr","type":"address"},{"indexed":false,"name":"term","type":"uint8"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"isValidator","type":"bool"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Locked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"contractAddr","type":"address"},{"indexed":false,"name":"edgewareAddr","type":"bytes"},{"indexed":false,"name":"time","type":"uint256"}],"name":"Signaled","type":"event"}]);
// UNIX dates for lockdrop reward events
const JUNE_1ST_UTC = 1559347200;
const JUNE_16TH_UTC = 1560643200;
const JULY_1ST_UTC = 1561939200;
const JULY_16TH_UTC = 1563235200;
const JULY_31ST_UTC = 1564531200;
const AUG_15TH_UTC = 1565827200;
const AUG_30TH_UTC = 1567123200;

$(async function() {
  $('#LOCK_LOOKUP_BTN').click(async function() {
    let addr = $('#LOCKDROP_PARTICIPANT_ADDRESS').val();
    // Sanitize address input
    if (!isHex(addr)) {
      alert('You must input a valid hex encoded Ethereum address')
      return;
    } else if ((addr.length !== 42 && addr.indexOf('0x') !== -1) ||
        (addr.length !== 40 && addr.indexOf('0x') === -1)) {
      alert('You must input a valid lengthed Ethereum address')
      return;
    } else {
      if (addr.length === 40) {
        addr = `0x${addr}`;
      }
    }
    let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
    const json = await $.getJSON('Lockdrop.json');
    web3 = setupWeb3Provider();
    const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
    $('#EFFECTIVE_ETH_CHART').empty();
    $('#ETH_CHART').empty();

    const lockEvents = await getLocks(contract, addr);
    const signalEvents = await getSignals(contract, addr);
    const now = await getCurrentTimestamp();
    let etherscanNet = 'https://etherscan.io/tx/';
    // Append only 1 signal event others will not be counted
    if (signalEvents.length > 0) {
      let balance = await web3.eth.getBalance(signalEvents[0].returnValues.contractAddr);
      balance = web3.utils.fromWei(balance, 'ether');
      $('#LOCK_LOOKUP_RESULTS').append($([
        '<li>',
        '   <div>',
        '     <h3>Signal Event</h3>',
        `     <p>Tx Hash: <a href=${etherscanNet}${signalEvents[0].transactionHash} target="_blank">${signalEvents[0].transactionHash}</a></p>`,
        `     <p>ETH Signaled: ${balance}</p>`,
        `     <p>Signaling Address: ${signalEvents[0].returnValues.contractAddr}</p>`,
        `     <p>EDG Keys: ${signalEvents[0].returnValues.edgewareAddr}</p>`,
        `     <p>Signal Time: ${signalEvents[0].returnValues.time}</p>`,
        '   </div>',
        '</li>',
      ].join('\n')))
    }
    // Parse out lock storage values
    let promises = lockEvents.map(async event => {
      let lockStorage = await getLockStorage(event.returnValues.lockAddr);
      return {
        txHash: event.transactionHash,
        owner: event.returnValues.owner,
        eth: web3.utils.fromWei(event.returnValues.eth, 'ether'),
        lockContractAddr: event.returnValues.lockAddr,
        term: event.returnValues.term,
        edgewarePublicKeys: event.returnValues.edgewareAddr,
        unlockTime: `${(lockStorage.unlockTime - now) / 60} minutes`,
        isValidator: event.returnValues.isValidator,
      };
    });
    // Create lock event list elements
    let results = await Promise.all(promises);
    results.map(r => {
      let listElt = $([
        '<li>',
        '   <div>',
        '     <h3>Lock Event</h3>',
        `     <p>Tx Hash: <a href=${etherscanNet}${r.txHash} target="_blank">${r.txHash}</a></p>`,
        `     <p>Owner: ${r.owner}</p>`,
        `     <p>ETH Locked: ${r.eth} ether</p>`,
        `     <p>LUC Address: ${r.lockContractAddr}</p>`,
        `     <p>Term Length: ${(r.term === 0) ? '3 months' : (r.term === 1) ? '6 months' : '12 months'}</p>`,
        `     <p>EDG Keys: ${r.edgewarePublicKeys}</p>`,
        `     <p>Unlock Time: ${r.unlockTime}</p>`,
        `     <p>Intent to validate: ${r.isValidator}</p>`,
        '   </div>',
        '</li>',
      ].join('\n'));
      $('#LOCK_LOOKUP_RESULTS').append(listElt);
    });
  });
});

// Draw the chart and set the chart values
async function drawChart() {
  try {
    summary = await getParticipationSummary();
  } catch (e) {
    summary = undefined;
  }

  if (!summary) {
    $('#CHARTS_LOADING').show().text('No data - You may be over the API limit. Wait 15 seconds and try again.');
    $('#EFFECTIVE_ETH_CHART').empty();
    $('#ETH_CHART').empty();
    return;
  }

  var vanillaData = google.visualization.arrayToDataTable([
    ['Type', 'Lock or signal action'],
    ['Locked ETH', Number(summary.totalETHLocked)],
    ['Signaled ETH', Number(summary.totalETHSignaled)],
  ]);

  $('.total-amount span').text(Number(summary.totalETH).toFixed(2));
  $('.locked-amount span').text(Number(summary.totalETHLocked).toFixed(2));
  $('.signaled-amount span').text(Number(summary.totalETHSignaled).toFixed(2));
  console.log(summary);
  const foundersEDG = 500000000;
  var effectiveData = google.visualization.arrayToDataTable([
    ['Type', 'Lock or signal action'],
    ['Lockers', Number(summary.lockersEDG)],
    ['Signalers', Number(summary.signalersEDG)],
    ['Other', foundersEDG],
  ]);

  var lockData = google.visualization.arrayToDataTable([
    ['EDG pubkey', 'ETH locked'],
    ...Object.keys(summary.locks).map(key => {
      return [key, Number(web3.utils.fromWei(summary.locks[key].lockAmt, 'ether'))];
    })
  ]);

  var validatingLockData = google.visualization.arrayToDataTable([
    ['Validating EDG pubkeys', 'ETH locked'],
    ...Object.keys(summary.validatingLocks).map(key => {
      return [key, Number(web3.utils.fromWei(summary.locks[key].lockAmt, 'ether'))];
    })
  ]);

  var signalData = google.visualization.arrayToDataTable([
    ['EDG pubkey', 'ETH signaled'],
    ...Object.keys(summary.signals).map(key => {
      return [key, Number(web3.utils.fromWei(summary.signals[key].signalAmt, 'ether'))];
    })
  ]);

  // Optional; add a title and set the width and height of the chart
  var width = $(window).width() > 600 ? 550 : $(window).width() - 100;
  var vanillaOptions = {
    title: 'ETH locked or signaled',
    width: width,
    height: 400,
  };
  var effectiveOptions = {
    title: 'EDG distribution',
    width: width,
    height: 400,
  };

  var lockDistributionOptions = {
    title: 'Lock distribution by EDG public keys',
    width: width,
    height: 400,
  };

  var validatingLockDistributionOptions = {
    title: 'Validating Lock distribution by EDG public keys',
    width: width,
    height: 400,
  };

  var signalDistributionOptions = {
    title: 'Signal distribution by EDG public keys',
    width: width,
    height: 400,
  };

  // Display the chart inside the <div> element with id="piechart"
  var vanillaChart = new google.visualization.PieChart(document.getElementById('ETH_CHART'));
  vanillaChart.draw(vanillaData, vanillaOptions);

  var effectiveChart = new google.visualization.PieChart(document.getElementById('EFFECTIVE_ETH_CHART'));
  effectiveChart.draw(effectiveData, effectiveOptions);

  var lockDistribution = new google.visualization.PieChart(document.getElementById('LOCK_DISTRIBUTION'));
  lockDistribution.draw(lockData, lockDistributionOptions);

  var validatingLockDistribution = new google.visualization.PieChart(document.getElementById('VALIDATING_LOCK_DISTRIBUTION'));
  validatingLockDistribution.draw(validatingLockData, validatingLockDistributionOptions);

  var signalDistribution = new google.visualization.PieChart(document.getElementById('SIGNAL_DISTRIBUTION'));
  signalDistribution.draw(signalData, signalDistributionOptions);
  $('#CHARTS_LOADING').hide();
}

function isHex(inputString) {
  const re = /^(0x)?[0-9A-Fa-f]+$/g;
  const result = re.test(inputString);
  re.lastIndex = 0;
  return result;
}

/**
 * Setup web3 provider using InjectedWeb3's injected providers
 */
function setupWeb3Provider(url) {
  // Setup web3 provider
  let provider;
  if (url) {
    provider = new Web3.providers.HttpProvider(url);
  } else {
    let network = $('input[name="network"]:checked').val();
    provider = new Web3.providers.HttpProvider(`https://mainnet.infura.io`);
  }

  return new window.Web3(provider);
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

const getLocks = async (lockdropContract, address) => {
  return await lockdropContract.getPastEvents('Locked', {
    fromBlock: 0,
    toBlock: 'latest',
    filter: {
      owner: address,
    }
  });
};

const getSignals = async (lockdropContract, address) => {
  return await lockdropContract.getPastEvents('Signaled', {
    fromBlock: 0,
    toBlock: 'latest',
    filter: {
      contractAddr: address,
    }
  });
};

const getLockStorage = async (lockAddress) => {
  return Promise.all([0,1].map(v => {
    return web3.eth.getStorageAt(lockAddress, v);
  }))
  .then(vals => {
    return {
      owner: vals[0],
      unlockTime: web3.utils.hexToNumber(vals[1]),
    };
  });
};

const getCurrentTimestamp = async () => {
  const block = await web3.eth.getBlock("latest");
  return block.timestamp;
};

const getParticipationSummary = async () => {
  let lockdropContractAddress = $('#LOCKDROP_CONTRACT_ADDRESS').val();
  const json = await $.getJSON('Lockdrop.json');
  $('#EFFECTIVE_ETH_CHART').empty();
  $('#ETH_CHART').empty();
  web3 = setupWeb3Provider(`https://eth-mainnet.alchemyapi.io/jsonrpc/-vPGIFwUyjlMRF9beTLXiGQUK6Nf3k8z`);
  const contract = new web3.eth.Contract(json.abi, lockdropContractAddress);
  // Get balances of the lockdrop
  let { locks, validatingLocks, totalETHLocked, totalEffectiveETHLocked, numLocks } = await calculateEffectiveLocks(contract);
  let { signals, totalETHSignaled, totalEffectiveETHSignaled, numSignals } = await calculateEffectiveSignals(contract);
  let totalETH = totalETHLocked.add(totalETHSignaled)
  let totalEffectiveETH = totalEffectiveETHLocked.add(totalEffectiveETHSignaled);
  let avgLock = totalETHLocked.div(web3.utils.toBN(numLocks));
  let avgSignal = totalETHSignaled.div(web3.utils.toBN(numSignals));

  // Compute fractions of lockers and signalers EDG from effective ETH
  const lockersEDG = web3.utils.toBN('4500000000').mul(totalEffectiveETHLocked).div(totalEffectiveETH);
  const signalersEDG = web3.utils.toBN('4500000000').mul(totalEffectiveETHSignaled).div(totalEffectiveETH);
  return {
    locks, validatingLocks, signals,
    lockersEDG, signalersEDG,
    totalETHLocked: web3.utils.fromWei(totalETHLocked, 'ether'),
    totalEffectiveETHLocked: web3.utils.fromWei(totalEffectiveETHLocked, 'ether'),
    totalETHSignaled: web3.utils.fromWei(totalETHSignaled, 'ether'),
    totalEffectiveETHSignaled: web3.utils.fromWei(totalEffectiveETHSignaled, 'ether'),
    totalETH: web3.utils.fromWei(totalETH, 'ether'),
    totalEffectiveETH: web3.utils.fromWei(totalEffectiveETH, 'ether'),
    numLocks,
    numSignals,
    avgLock: web3.utils.fromWei(avgLock, 'ether'),
    avgSignal: web3.utils.fromWei(avgSignal, 'ether'),
  };
}

const getTotalLockedBalance = async (lockdropContract) => {
  let { totalETHLocked, totalEffectiveETHLocked } = await calculateEffectiveLocks(lockdropContract);
  return { totalETHLocked, totalEffectiveETHLocked };
};

const getTotalSignaledBalance = async (lockdropContract) => {
  let { totalETHSignaled, totalEffectiveETHSignaled } = await calculateEffectiveSignals(lockdropContract);
  return { totalETHSignaled, totalEffectiveETHSignaled };
};

const calculateEffectiveLocks = async (lockdropContract) => {
  let totalETHLocked = web3.utils.toBN(0);
  let totalEffectiveETHLocked = web3.utils.toBN(0);
  const locks = {};
  const validatingLocks = {};

  // Get all lock events
  const lockEvents = await lockdropContract.getPastEvents('Locked', {
    fromBlock: 0,
    toBlock: 'latest',
  });
  // Compatibility with all contract formats
  let lockdropStartTime = (await lockdropContract.methods.LOCK_START_TIME().call());
  // Add balances and effective values to total
  lockEvents.forEach((event) => {
    const data = event.returnValues;
    let value = getEffectiveValue(data.eth, data.term, data.time, lockdropStartTime, totalETHLocked);
    totalETHLocked = totalETHLocked.add(web3.utils.toBN(data.eth));
    totalEffectiveETHLocked = totalEffectiveETHLocked.add(value);

    // Add all validators to a separate collection to do validator election over later
    if (data.isValidator) {
      if (data.edgewareAddr in validatingLocks) {
        validatingLocks[data.edgewareAddr] = {
          lockAmt: web3.utils.toBN(data.eth).add(web3.utils.toBN(validatingLocks[data.edgewareAddr].lockAmt)).toString(),
          effectiveValue: web3.utils.toBN(validatingLocks[data.edgewareAddr].effectiveValue).add(value).toString(),
          lockAddrs: [data.lockAddr, ...validatingLocks[data.edgewareAddr].lockAddrs],
        };
      } else {
        validatingLocks[data.edgewareAddr] = {
          lockAmt: web3.utils.toBN(data.eth).toString(),
          effectiveValue: value.toString(),
          lockAddrs: [data.lockAddr],
        };
      } 
    }
    // Add all lockers to a collection for data processing
    if (data.edgewareAddr in locks) {
      locks[data.edgewareAddr] = {
        lockAmt: web3.utils.toBN(data.eth).add(web3.utils.toBN(locks[data.edgewareAddr].lockAmt)).toString(),
        effectiveValue: web3.utils.toBN(locks[data.edgewareAddr].effectiveValue).add(value).toString(),
        lockAddrs: [data.lockAddr, ...locks[data.edgewareAddr].lockAddrs],
      };
    } else {
      locks[data.edgewareAddr] = {
        lockAmt: web3.utils.toBN(data.eth).toString(),
        effectiveValue: value.toString(),
        lockAddrs: [data.lockAddr],
      };
    }
  });
  // Return validating locks, locks, and total ETH locked
  return { locks, validatingLocks, totalETHLocked, totalEffectiveETHLocked, numLocks: lockEvents.length };
};

const calculateEffectiveSignals = async (lockdropContract, blockNumber=null, batchSize=100) => {
  let totalETHSignaled = web3.utils.toBN(0);
  let totalEffectiveETHSignaled = web3.utils.toBN(0);
  const signals = {};
  const signalEvents = await lockdropContract.getPastEvents('Signaled', {
    fromBlock: 0,
    toBlock: 'latest',
  });

  const seenSignalers = {};

  let getSignalers = signalEvents.map((event) => {
    if (event.returnValues.contractAddr in seenSignalers) {
      return { seen: true };
    } else {
      seenSignalers[event.returnValues.contractAddr] = true;
      return {
        seen: false,
        contractAddr: event.returnValues.contractAddr,
        edgewareAddr: event.returnValues.edgewareAddr,
      };
    }
  }).filter(s => (!s.seen));

  while (getSignalers.length > 0) {
    let signalerBatch;
    if (getSignalers.length >= batchSize) {
      signalerBatch = getSignalers.slice(0, batchSize);
      getSignalers = getSignalers.slice(batchSize);
    } else {
      signalerBatch = getSignalers;
      getSignalers = [];
    }
    signalerBatch = signalerBatch.map(async s => {
      // Get balance at block that lockdrop ends
      let balance;
      if (blockNumber) {
        balance = await web3.eth.getBalance(s.contractAddr, blockNumber);
      } else {
        balance = await web3.eth.getBalance(s.contractAddr);
      }

      const value = getEffectiveValue(balance, 'signaling');
      // Add value to total signaled ETH
      totalETHSignaled = totalETHSignaled.add(web3.utils.toBN(balance));
      totalEffectiveETHSignaled = totalEffectiveETHSignaled.add(value);

      // Add all lockers to a collection for data processing
      if (s.edgewareAddr in signals) {
        signals[s.edgewareAddr] = {
          signalAmt: web3.utils.toBN(balance).add(web3.utils.toBN(signals[s.edgewareAddr].signalAmt)).toString(),
          effectiveValue: web3.utils.toBN(signals[s.edgewareAddr].effectiveValue).add(value).toString(),
        };
      } else {
        signals[s.edgewareAddr] = {
          signalAmt: web3.utils.toBN(balance).toString(),
          effectiveValue: value.toString(),
        };
      }
      return { value, balance, ...s };
    });

    signalerBatch = await Promise.all(signalerBatch);
    console.log(signalerBatch.length, getSignalers.length);
    await sleep(250);
  }
  // Return signals and total ETH signaled
  return { signals, totalETHSignaled, totalEffectiveETHSignaled, numSignals: signalEvents.length };
}

function getEffectiveValue(ethAmount, term, lockTime, lockStart, totalETH) {
  let additiveBonus;
  ethAmount = web3.utils.toBN(ethAmount);
  // get additive bonus if calculating allocation of locks
  if (lockTime && lockStart) {
    lockTime = web3.utils.toBN(lockTime);
    lockStart = web3.utils.toBN(lockStart);
    totalETH = web3.utils.toBN(totalETH);
    additiveBonus = getAdditiveBonus(lockTime, lockStart);
  }

  if (term == '0') {
    // three month term yields no bonus
    return ethAmount.mul(web3.utils.toBN(100).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == '1') {
    // six month term yields 30% bonus
    return ethAmount.mul(web3.utils.toBN(130).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == '2') {
    // twelve month term yields 120% bonus
    return ethAmount.mul(web3.utils.toBN(220).add(additiveBonus)).div(web3.utils.toBN(100));
  } else if (term == 'signaling') {
    // signaling yields 80% deduction
    return ethAmount.mul(web3.utils.toBN(20)).div(web3.utils.toBN(100));
  } else {
    // invalid term
    console.error('Found invalid term');
    return web3.utils.toBN(0);
  }
}

const getAdditiveBonus = (lockTime, lockStart) => {
  if (!lockStart.eq(web3.utils.toBN(JUNE_1ST_UTC))) {
    return web3.utils.toBN(0);
  } else {
    if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JUNE_16TH_UTC))) {
      return web3.utils.toBN(50);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_1ST_UTC))) {
      return web3.utils.toBN(40);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_16TH_UTC))) {
      return web3.utils.toBN(30);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(JULY_31ST_UTC))) {
      return web3.utils.toBN(20);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(AUG_15TH_UTC))) {
      return web3.utils.toBN(10);
    } else if (web3.utils.toBN(lockTime).lte(web3.utils.toBN(AUG_30TH_UTC))) {
      return web3.utils.toBN(0);
    } else {
      return web3.utils.toBN(0);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
