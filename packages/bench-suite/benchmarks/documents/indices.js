const crypto = require('crypto');

const TYPES = require('../../lib/benchmarks/types');

const createIndices = require('../../lib/util/createIndices');
const createProperties = require('../../lib/util/createProperties');

let documents;

module.exports = {
  title: '100 Indices',

  type: TYPES.DOCUMENTS,

  /**
   * Define document types
   *
   * It can be function or object
   *
   * @type {Object|Function}
   */
  documentTypes: {
    indices: {
      type: 'object',
      indices: createIndices(100),
      properties: createProperties(100, {
        type: 'string',
        maxLength: 63,
      }),
      additionalProperties: false,
    },
    uniqueIndices: {
      type: 'object',
      indices: createIndices(100, true),
      properties: createProperties(100, {
        type: 'string',
        maxLength: 63,
      }),
      additionalProperties: false,
    },
  },

  /**
   * Return documents to create
   *
   * this function calling for each document type
   *
   * @param {string} type
   * @returns {Object[]}
   */
  // eslint-disable-next-line no-unused-vars
  documents: (type) => {
    // Broadcast the same documents for each document type
    if (documents) {
      return documents;
    }

    // We get 35x3 results running against local network
    // since metrics are gathering from all 3 nodes
    documents = new Array(35).fill(null).map(() => {
      const properties = {};

      for (let i = 0; i < 100; i++) {
        const name = `property${i}`;

        properties[name] = crypto.randomBytes(20)
          .toString('hex');
      }

      return properties;
    });

    return documents;
  },

  /**
   * How many credits this benchmark requires to run
   *
   * @type {number}
   */
  requiredCredits: 100000,

  /**
   * Statistical function
   *
   * Available functions: https://mathjs.org/docs/reference/functions.html#statistics-functions
   *
   * @type {string}
   */
  avgFunction: 'median',

  /**
   * Show all or only statistic result
   *
   * @type {boolean}
   */
  avgOnly: false,
};
