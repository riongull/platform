const codes = require('./codes');

/**
 *
 * @param {number} code
 * @param {*[]} args
 * @returns {*}
 */
function createConsensusError(code, args) {
  if (!codes[code]) {
    throw new Error(`Consensus error with code ${code} is not defined. Probably you need to update DPP`);
  }

  if (code === 1042) {
    console.error('Create consensus error for bad instant lock signature');
    console.log(args);
  }

  return new codes[code](...args);
}

module.exports = createConsensusError;
