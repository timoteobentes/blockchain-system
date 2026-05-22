import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SELVATraceability', function () {
  // ── Fixture: deploy fresco antes de cada grupo de testes ──────────────
  async function deployFixture() {
    const [owner, userA, userB, userC, stranger] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory('SELVATraceability');
    const contract = await Contract.deploy();

    return { contract, owner, userA, userB, userC, stranger };
  }

  // ── Fixture: deploy + userA já registrado ─────────────────────────────
  async function withRegisteredUserA() {
    const ctx = await deployFixture();
    const tx = await ctx.contract.connect(ctx.userA).registerUser('Alice', '111.111.111-11');
    await tx.wait();
    const userAHash = await ctx.contract.userHashOf(ctx.userA.address);
    return { ...ctx, userAHash };
  }

  // ── Fixture: deploy + userA registrado + promovido a produtor ─────────
  async function withProducerA() {
    const ctx = await withRegisteredUserA();
    await ctx.contract.connect(ctx.owner).makeProducer(ctx.userA.address);
    return ctx;
  }

  // ── Fixture: deploy + produtor + produto "LOT001" registrado ──────────
  async function withProduct() {
    const ctx = await withProducerA();
    const docHash = ethers.keccak256(ethers.toUtf8Bytes('license-doc-001'));
    await ctx.contract
      .connect(ctx.userA)
      .addProduct('LOT001', 500, 'Copaíba - AM', docHash);
    return { ...ctx, docHash };
  }

  // ════════════════════════════════════════════════════════════════════════
  // registerUser
  // ════════════════════════════════════════════════════════════════════════
  describe('registerUser', function () {
    it('deve registrar usuário e emitir UserRegistered', async function () {
      const { contract, userA } = await loadFixture(deployFixture);

      await expect(contract.connect(userA).registerUser('Alice', '111.111.111-11'))
        .to.emit(contract, 'UserRegistered')
        .withArgs(
          // userHash é derivado on-chain; verificamos apenas o endereço
          (v: string) => v !== ethers.ZeroHash,
          userA.address,
        );
    });

    it('deve retornar userHash não-zero', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await contract.connect(userA).registerUser('Alice', '111.111.111-11');
      const hash = await contract.userHashOf(userA.address);
      expect(hash).to.not.equal(ethers.ZeroHash);
    });

    it('deve persistir dados via getUser', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await contract.connect(userA).registerUser('Alice', '111.111.111-11');
      const hash = await contract.userHashOf(userA.address);
      const [name, cpf, account] = await contract.getUser(hash);
      expect(name).to.equal('Alice');
      expect(cpf).to.equal('111.111.111-11');
      expect(account).to.equal(userA.address);
    });

    it('deve adicionar hash ao índice de usuários', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await contract.connect(userA).registerUser('Alice', '111.111.111-11');
      const index = await contract.listAllUsers();
      expect(index).to.have.length(1);
    });

    it('deve rejeitar name vazio', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await expect(
        contract.connect(userA).registerUser('', '111.111.111-11'),
      ).to.be.revertedWith('Invalid input');
    });

    it('deve rejeitar cpf vazio', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await expect(
        contract.connect(userA).registerUser('Alice', ''),
      ).to.be.revertedWith('Invalid input');
    });

    it('deve rejeitar endereço já registrado', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      await contract.connect(userA).registerUser('Alice', '111.111.111-11');
      await expect(
        contract.connect(userA).registerUser('Alice2', '222.222.222-22'),
      ).to.be.revertedWith('Address already registered');
    });

    it('isUserRegistered deve retornar true após registro', async function () {
      const { contract, userA } = await loadFixture(deployFixture);
      expect(await contract.isUserRegistered(userA.address)).to.equal(false);
      await contract.connect(userA).registerUser('Alice', '111.111.111-11');
      expect(await contract.isUserRegistered(userA.address)).to.equal(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // makeProducer
  // ════════════════════════════════════════════════════════════════════════
  describe('makeProducer', function () {
    it('deve promover usuário registrado a produtor', async function () {
      const { contract, owner, userA } = await loadFixture(withRegisteredUserA);
      await expect(contract.connect(owner).makeProducer(userA.address))
        .to.emit(contract, 'ProducerCreated')
        .withArgs(userA.address);
      expect(await contract.isProducer(userA.address)).to.equal(true);
    });

    it('deve rejeitar chamada de não-owner', async function () {
      const { contract, userA, stranger } = await loadFixture(withRegisteredUserA);
      await expect(
        contract.connect(stranger).makeProducer(userA.address),
      ).to.be.revertedWith('Only contract owner');
    });

    it('deve rejeitar zero address', async function () {
      const { contract, owner } = await loadFixture(withRegisteredUserA);
      await expect(
        contract.connect(owner).makeProducer(ethers.ZeroAddress),
      ).to.be.revertedWith('Zero address');
    });

    it('deve rejeitar usuário não registrado', async function () {
      const { contract, owner, stranger } = await loadFixture(deployFixture);
      await expect(
        contract.connect(owner).makeProducer(stranger.address),
      ).to.be.revertedWith('User not registered');
    });

    it('deve rejeitar promoção duplicada', async function () {
      const { contract, owner, userA } = await loadFixture(withRegisteredUserA);
      await contract.connect(owner).makeProducer(userA.address);
      await expect(
        contract.connect(owner).makeProducer(userA.address),
      ).to.be.revertedWith('Already producer');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // addProduct
  // ════════════════════════════════════════════════════════════════════════
  describe('addProduct', function () {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes('license-doc-001'));

    it('deve registrar produto e emitir ProductAdded', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await expect(contract.connect(userA).addProduct('LOT001', 500, 'Copaíba - AM', docHash))
        .to.emit(contract, 'ProductAdded')
        .withArgs('LOT001', userA.address, docHash);
    });

    it('deve persistir dados via getProduct', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await contract.connect(userA).addProduct('LOT001', 500, 'Copaíba - AM', docHash);
      const p = await contract.getProduct('LOT001');
      expect(p.lotId).to.equal('LOT001');
      expect(p.volume).to.equal(500n);
      expect(p.origin).to.equal('Copaíba - AM');
      expect(p.producer).to.equal(userA.address);
      expect(p.currentOwner).to.equal(userA.address);
      expect(p.documentHash).to.equal(docHash);
      expect(p.active).to.equal(true);
    });

    it('deve criar entrada CREATED no histórico', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await contract.connect(userA).addProduct('LOT001', 500, 'Copaíba - AM', docHash);
      const h = await contract.getProductHistory('LOT001');
      expect(h.actors).to.have.length(1);
      expect(h.actions[0]).to.equal('CREATED');
      expect(h.froms[0]).to.equal(ethers.ZeroAddress);
      expect(h.tos[0]).to.equal(userA.address);
    });

    it('deve adicionar lotId ao índice', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await contract.connect(userA).addProduct('LOT001', 500, 'Copaíba - AM', docHash);
      const ids = await contract.listAllLotIds();
      expect(ids).to.include('LOT001');
    });

    it('deve rejeitar chamada de não-produtor', async function () {
      const { contract, stranger } = await loadFixture(withProducerA);
      await expect(
        contract.connect(stranger).addProduct('LOT001', 500, 'Copaíba - AM', docHash),
      ).to.be.revertedWith('Only producers can add products');
    });

    it('deve rejeitar lotId vazio', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await expect(
        contract.connect(userA).addProduct('', 500, 'Copaíba - AM', docHash),
      ).to.be.revertedWith('Missing lotId');
    });

    it('deve rejeitar volume zero', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await expect(
        contract.connect(userA).addProduct('LOT001', 0, 'Copaíba - AM', docHash),
      ).to.be.revertedWith('Volume must be > 0');
    });

    it('deve rejeitar lotId duplicado', async function () {
      const { contract, userA } = await loadFixture(withProducerA);
      await contract.connect(userA).addProduct('LOT001', 500, 'Copaíba - AM', docHash);
      await expect(
        contract.connect(userA).addProduct('LOT001', 300, 'Outro', docHash),
      ).to.be.revertedWith('Product with this lot ID already exists');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // transferProduct
  // ════════════════════════════════════════════════════════════════════════
  describe('transferProduct', function () {
    it('deve transferir propriedade e emitir OwnershipTransferred', async function () {
      const { contract, userA, userB } = await loadFixture(withProduct);
      await expect(contract.connect(userA).transferProduct('LOT001', userB.address))
        .to.emit(contract, 'OwnershipTransferred')
        .withArgs('LOT001', userA.address, userB.address);

      const p = await contract.getProduct('LOT001');
      expect(p.currentOwner).to.equal(userB.address);
    });

    it('deve criar entrada TRANSFERRED no histórico', async function () {
      const { contract, userA, userB } = await loadFixture(withProduct);
      await contract.connect(userA).transferProduct('LOT001', userB.address);
      const h = await contract.getProductHistory('LOT001');
      expect(h.actions[1]).to.equal('TRANSFERRED');
      expect(h.froms[1]).to.equal(userA.address);
      expect(h.tos[1]).to.equal(userB.address);
    });

    it('novo dono pode transferir novamente', async function () {
      const { contract, userA, userB, userC } = await loadFixture(withProduct);
      await contract.connect(userA).transferProduct('LOT001', userB.address);
      await contract.connect(userB).transferProduct('LOT001', userC.address);
      const p = await contract.getProduct('LOT001');
      expect(p.currentOwner).to.equal(userC.address);
      const h = await contract.getProductHistory('LOT001');
      expect(h.actors).to.have.length(3); // CREATED + TRANSFERRED + TRANSFERRED
    });

    it('deve rejeitar transferência por não-dono', async function () {
      const { contract, userB } = await loadFixture(withProduct);
      await expect(
        contract.connect(userB).transferProduct('LOT001', userB.address),
      ).to.be.revertedWith('Only current owner can transfer this product');
    });

    it('deve rejeitar zero address como destino', async function () {
      const { contract, userA } = await loadFixture(withProduct);
      await expect(
        contract.connect(userA).transferProduct('LOT001', ethers.ZeroAddress),
      ).to.be.revertedWith('Zero address');
    });

    it('deve rejeitar produto inexistente', async function () {
      const { contract, userA } = await loadFixture(withProduct);
      await expect(
        contract.connect(userA).transferProduct('INEXISTENTE', userA.address),
      ).to.be.revertedWith('Product not found or inactive');
    });

    it('deve rejeitar produto inativo', async function () {
      const { contract, owner, userA, userB } = await loadFixture(withProduct);
      await contract.connect(owner).deactivateProduct('LOT001');
      await expect(
        contract.connect(userA).transferProduct('LOT001', userB.address),
      ).to.be.revertedWith('Product not found or inactive');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // deactivateProduct
  // ════════════════════════════════════════════════════════════════════════
  describe('deactivateProduct', function () {
    it('deve desativar produto e criar entrada DEACTIVATED', async function () {
      const { contract, owner } = await loadFixture(withProduct);
      await contract.connect(owner).deactivateProduct('LOT001');
      const p = await contract.getProduct('LOT001');
      expect(p.active).to.equal(false);
      const h = await contract.getProductHistory('LOT001');
      expect(h.actions[h.actions.length - 1]).to.equal('DEACTIVATED');
    });

    it('deve rejeitar chamada de não-owner', async function () {
      const { contract, userA } = await loadFixture(withProduct);
      await expect(
        contract.connect(userA).deactivateProduct('LOT001'),
      ).to.be.revertedWith('Only contract owner');
    });

    it('deve rejeitar produto inexistente', async function () {
      const { contract, owner } = await loadFixture(withProduct);
      await expect(
        contract.connect(owner).deactivateProduct('INEXISTENTE'),
      ).to.be.revertedWith('Product not found');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getProduct
  // ════════════════════════════════════════════════════════════════════════
  describe('getProduct', function () {
    it('deve rejeitar lotId inexistente', async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.getProduct('NAOEXISTE')).to.be.revertedWith('Product not found');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getProductHistory — arrays paralelos e ordem cronológica
  // ════════════════════════════════════════════════════════════════════════
  describe('getProductHistory', function () {
    it('deve retornar 6 arrays paralelos de mesmo tamanho', async function () {
      const { contract, userA, userB } = await loadFixture(withProduct);
      await contract.connect(userA).transferProduct('LOT001', userB.address);
      const h = await contract.getProductHistory('LOT001');
      const len = h.actors.length;
      expect(len).to.equal(2);
      expect(h.actions.length).to.equal(len);
      expect(h.docHashes.length).to.equal(len);
      expect(h.froms.length).to.equal(len);
      expect(h.tos.length).to.equal(len);
      expect(h.timestamps.length).to.equal(len);
    });

    it('timestamps devem ser crescentes', async function () {
      const { contract, userA, userB, userC } = await loadFixture(withProduct);
      await contract.connect(userA).transferProduct('LOT001', userB.address);
      await contract.connect(userB).transferProduct('LOT001', userC.address);
      const h = await contract.getProductHistory('LOT001');
      expect(h.timestamps[0]).to.be.lte(h.timestamps[1]);
      expect(h.timestamps[1]).to.be.lte(h.timestamps[2]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // getUser
  // ════════════════════════════════════════════════════════════════════════
  describe('getUser', function () {
    it('deve rejeitar hash inválido', async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.getUser(ethers.ZeroHash),
      ).to.be.revertedWith('User not found');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Cenário end-to-end — fluxo completo do MVP
  // ════════════════════════════════════════════════════════════════════════
  describe('Fluxo E2E', function () {
    it('registro → promoção → lote → transferência → rastreabilidade', async function () {
      const { contract, owner, userA, userB, userC } = await loadFixture(deployFixture);

      // 1. Três usuários se registram
      await contract.connect(userA).registerUser('Alice (Extrativista)', '111.111.111-11');
      await contract.connect(userB).registerUser('Bob (Distribuidor)', '222.222.222-22');
      await contract.connect(userC).registerUser('Carol (Varejista)', '333.333.333-33');

      expect(await contract.listAllUsers()).to.have.length(3);

      // 2. Admin promove Alice a produtora
      await contract.connect(owner).makeProducer(userA.address);
      expect(await contract.isProducer(userA.address)).to.equal(true);

      // 3. Alice registra um lote de copaíba
      const docHash = ethers.keccak256(ethers.toUtf8Bytes('licenca-ibama-001'));
      await contract.connect(userA).addProduct('COPA-2025-001', 1000, 'Copaifera langsdorffii - Manaus/AM', docHash);

      const lote = await contract.getProduct('COPA-2025-001');
      expect(lote.producer).to.equal(userA.address);
      expect(lote.currentOwner).to.equal(userA.address);

      // 4. Alice → Bob (distribuidor)
      await contract.connect(userA).transferProduct('COPA-2025-001', userB.address);
      // 5. Bob → Carol (varejista)
      await contract.connect(userB).transferProduct('COPA-2025-001', userC.address);

      // 6. Rastreabilidade pública: qualquer um consulta
      const history = await contract.getProductHistory('COPA-2025-001');
      expect(history.actors).to.have.length(3);
      expect(history.actions[0]).to.equal('CREATED');
      expect(history.actions[1]).to.equal('TRANSFERRED');
      expect(history.actions[2]).to.equal('TRANSFERRED');
      expect(history.tos[2]).to.equal(userC.address);

      // Lote ainda ativo, produtor original preservado
      const final = await contract.getProduct('COPA-2025-001');
      expect(final.producer).to.equal(userA.address);
      expect(final.currentOwner).to.equal(userC.address);
      expect(final.active).to.equal(true);
    });
  });
});
