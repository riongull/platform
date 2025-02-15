const {
  tendermint: {
    abci: {
      ResponseQuery,
    },
  },
} = require('@dashevo/abci/types');

const cbor = require('cbor');

const {
  v0: {
    GetIdentitiesByPublicKeyHashesResponse,
    Proof,
    ResponseMetadata,
  },
} = require('@dashevo/dapi-grpc');

const getIdentityFixture = require('@dashevo/dpp/lib/test/fixtures/getIdentityFixture');

const identitiesByPublicKeyHashesQueryHandlerFactory = require(
  '../../../../../lib/abci/handlers/query/identitiesByPublicKeyHashesQueryHandlerFactory',
);
const InvalidArgumentAbciError = require('../../../../../lib/abci/errors/InvalidArgumentAbciError');
const BlockExecutionContextStackMock = require('../../../../../lib/test/mock/BlockExecutionContextStackMock');
const UnimplementedAbciError = require('../../../../../lib/abci/errors/UnimplementedAbciError');

describe('identitiesByPublicKeyHashesQueryHandlerFactory', () => {
  let identitiesByPublicKeyHashesQueryHandler;
  let signedPublicKeyToIdentityIdRepositoryMock;
  let signedIdentityRepositoryMock;
  let publicKeyHashes;
  let identities;
  let maxIdentitiesPerRequest;
  let previousRootTreeMock;
  let createQueryResponseMock;
  let responseMock;
  let blockExecutionContextStackMock;
  let params;
  let data;

  beforeEach(function beforeEach() {
    signedPublicKeyToIdentityIdRepositoryMock = {
      fetchBuffer: this.sinon.stub(),
    };

    signedIdentityRepositoryMock = {
      fetch: this.sinon.stub(),
    };

    previousRootTreeMock = {
      getFullProofForOneLeaf: this.sinon.stub(),
      getProof: this.sinon.stub(),
    };

    maxIdentitiesPerRequest = 5;

    createQueryResponseMock = this.sinon.stub();

    responseMock = new GetIdentitiesByPublicKeyHashesResponse();
    responseMock.setProof(new Proof());

    createQueryResponseMock.returns(responseMock);

    blockExecutionContextStackMock = new BlockExecutionContextStackMock(this.sinon);

    blockExecutionContextStackMock.getLast.returns(true);

    identitiesByPublicKeyHashesQueryHandler = identitiesByPublicKeyHashesQueryHandlerFactory(
      signedPublicKeyToIdentityIdRepositoryMock,
      signedIdentityRepositoryMock,
      maxIdentitiesPerRequest,
      createQueryResponseMock,
      blockExecutionContextStackMock,
    );

    publicKeyHashes = [
      Buffer.from('784ca12495d2e61f992db9e55d1f9599b0cf1328', 'hex'),
      Buffer.from('784ca12495d2e61f992db9e55d1f9599b0cf1329', 'hex'),
      Buffer.from('784ca12495d2e61f992db9e55d1f9599b0cf1330', 'hex'),
    ];

    identities = [
      getIdentityFixture(),
      getIdentityFixture(),
    ];

    signedPublicKeyToIdentityIdRepositoryMock
      .fetchBuffer
      .withArgs(publicKeyHashes[0])
      .resolves(cbor.encode([identities[0].getId()]));

    signedPublicKeyToIdentityIdRepositoryMock
      .fetchBuffer
      .withArgs(publicKeyHashes[1])
      .resolves(cbor.encode([identities[1].getId()]));

    signedIdentityRepositoryMock.fetch
      .withArgs(identities[0].getId())
      .resolves(identities[0]);

    signedIdentityRepositoryMock.fetch
      .withArgs(identities[0].getId())
      .resolves(identities[1]);

    params = {};
    data = { publicKeyHashes };
  });

  it('should return empty response if there is no signed state', async () => {
    blockExecutionContextStackMock.getLast.returns(null);

    responseMock = new GetIdentitiesByPublicKeyHashesResponse();
    responseMock.setIdentitiesList([
      cbor.encode([]),
      cbor.encode([]),
      cbor.encode([]),
    ]);
    responseMock.setMetadata(new ResponseMetadata());

    const result = await identitiesByPublicKeyHashesQueryHandler(params, data, {});

    expect(result).to.be.an.instanceof(ResponseQuery);
    expect(result.code).to.equal(0);

    expect(result.value).to.deep.equal(responseMock.serializeBinary());

    expect(signedPublicKeyToIdentityIdRepositoryMock.fetchBuffer).to.have.not.been.called();
    expect(previousRootTreeMock.getFullProofForOneLeaf).to.have.not.been.called();
  });

  it('should throw an error if maximum requested items exceeded', async () => {
    maxIdentitiesPerRequest = 1;

    identitiesByPublicKeyHashesQueryHandler = identitiesByPublicKeyHashesQueryHandlerFactory(
      signedPublicKeyToIdentityIdRepositoryMock,
      signedIdentityRepositoryMock,
      maxIdentitiesPerRequest,
      createQueryResponseMock,
      blockExecutionContextStackMock,
    );

    try {
      await identitiesByPublicKeyHashesQueryHandler(params, data, {});

      expect.fail('Error was not thrown');
    } catch (e) {
      expect(e).to.be.an.instanceOf(InvalidArgumentAbciError);
      expect(e.getData()).to.deep.equal({
        maxIdentitiesPerRequest,
      });
    }
  });

  it('should return identity id map', async () => {
    const result = await identitiesByPublicKeyHashesQueryHandler(params, data, {});

    expect(signedPublicKeyToIdentityIdRepositoryMock.fetchBuffer.callCount).to.equal(
      publicKeyHashes.length,
    );

    expect(signedPublicKeyToIdentityIdRepositoryMock.fetchBuffer.getCall(0).args).to.deep.equal([
      publicKeyHashes[0],
    ]);

    expect(signedPublicKeyToIdentityIdRepositoryMock.fetchBuffer.getCall(1).args).to.deep.equal([
      publicKeyHashes[1],
    ]);

    expect(signedPublicKeyToIdentityIdRepositoryMock.fetchBuffer.getCall(2).args).to.deep.equal([
      publicKeyHashes[2],
    ]);

    expect(signedIdentityRepositoryMock.fetch.callCount).to.equal(
      identities.length,
    );

    expect(signedIdentityRepositoryMock.fetch.getCall(0).args).to.deep.equal([
      identities[0].getId(),
    ]);

    expect(signedIdentityRepositoryMock.fetch.getCall(1).args).to.deep.equal([
      identities[1].getId(),
    ]);

    expect(result).to.be.an.instanceof(ResponseQuery);
    expect(result.code).to.equal(0);
    expect(result.value).to.deep.equal(responseMock.serializeBinary());
  });

  it('should throw UnimplementedAbciError of proof requested', async () => {
    // const proof = {
    //   rootTreeProof: Buffer.from('0100000001f0faf5f55674905a68eba1be2f946e667c1cb5010101',
    //   'hex'),
    //   storeTreeProof: Buffer.from('03046b657931060076616c75653103046b657932060076616c75653210',
    //   'hex'),
    // };

    try {
      await identitiesByPublicKeyHashesQueryHandler(params, data, { prove: true });

      expect.fail('should throw UnimplementedAbciError');
    } catch (e) {
      expect(e).to.be.an.instanceof(UnimplementedAbciError);
    }
  });
});
