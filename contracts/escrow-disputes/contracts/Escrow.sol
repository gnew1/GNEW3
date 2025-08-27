
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * GNEW · N325 — Reembolsos/chargebacks with escrow
 * Rol: Backend + Legal
 * Objetivo: Resolución con pruebas y SLAs.
 * Stack: Escrow SC, colas de disputa, firma (EIP-712).
 * Entregables: Flujos UI, estados, reportes.
 * Pasos: Evidencias; fallbacks; arbitraje.
 * DoD: tiempos ≤ SLA; consistencia; eventos auditable.
 * Seguridad & Observabilidad: ReentrancyGuard; trazas por eventos; privacidad (evidencia referencia hash/IPFS).
 * Despliegue: Por vertical.
 */

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Escrow is Ownable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    enum State {
        Pending,    // creado, a la espera de fondos
        Funded,     // fondos depositados
        Released,   // fondos al vendedor
        Refunded,   // fondos al comprador
        Disputed,   // en disputa
        Resolved    // resuelto por árbitro o acuerdo
    }

    struct Deal {
        uint256 id;
        address buyer;
        address seller;
        address token;     // address(0) = native
        uint256 amount;    // monto bruto en token/nativo
        uint16  feeBps;    // fee plataforma (max 1000 = 10%)
        State   state;
        uint64  createdAt;
        uint64  fundedAt;
        uint64  respondBy;   // SLA respuesta inicial (segundos desde funded)
        uint64  arbitrateBy; // SLA arbitraje
    }

    uint256 public nextId = 1;
    address public feeTreasury;
    uint16 public constant MAX_FEE_BPS = 1000; // 10%
    bytes32 public constant SETTLE_TYPEHASH = keccak256(
        "SettleDispute(uint256 dealId,uint8 outcome,uint256 nonce,uint256 deadline)"
    );

    mapping(uint256 => Deal) public deals;
    mapping(uint256 => string) public evidenceHashes; // IPFS hash para evidencias
    mapping(address => uint256) public nonces;

    event DealCreated(uint256 indexed dealId, address indexed buyer, address indexed seller, uint256 amount);
    event DealFunded(uint256 indexed dealId, uint256 fundedAt);
    event DealReleased(uint256 indexed dealId, uint256 releasedAt);
    event DealRefunded(uint256 indexed dealId, uint256 refundedAt);
    event DisputeRaised(uint256 indexed dealId, address indexed raiser, string evidenceHash);
    event DisputeResolved(uint256 indexed dealId, uint8 outcome, address resolver);

    error InvalidDeal();
    error InvalidState();
    error Unauthorized();
    error InvalidSignature();
    error DeadlineExpired();
    error InsufficientAmount();

    constructor(address _feeTreasury) Ownable(msg.sender) EIP712("GNEWEscrow", "1") {
        feeTreasury = _feeTreasury;
    }

    /**
     * @notice Crear nuevo deal de escrow
     * @param buyer Dirección del comprador
     * @param seller Dirección del vendedor
     * @param token Token a usar (address(0) para nativo)
     * @param amount Monto bruto
     * @param feeBps Fee en basis points
     * @param respondBy Tiempo límite para respuesta inicial (segundos desde funding)
     * @param arbitrateBy Tiempo límite para arbitraje (segundos desde disputa)
     */
    function createDeal(
        address buyer,
        address seller,
        address token,
        uint256 amount,
        uint16 feeBps,
        uint64 respondBy,
        uint64 arbitrateBy
    ) external returns (uint256 dealId) {
        if (buyer == address(0) || seller == address(0)) revert InvalidDeal();
        if (feeBps > MAX_FEE_BPS) revert InvalidDeal();
        if (amount == 0) revert InsufficientAmount();

        dealId = nextId++;
        deals[dealId] = Deal({
            id: dealId,
            buyer: buyer,
            seller: seller,
            token: token,
            amount: amount,
            feeBps: feeBps,
            state: State.Pending,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            respondBy: respondBy,
            arbitrateBy: arbitrateBy
        });

        emit DealCreated(dealId, buyer, seller, amount);
    }

    /**
     * @notice Financiar deal (solo comprador)
     */
    function fundDeal(uint256 dealId) external payable nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.state != State.Pending) revert InvalidState();
        if (msg.sender != deal.buyer) revert Unauthorized();

        if (deal.token == address(0)) {
            if (msg.value != deal.amount) revert InsufficientAmount();
        } else {
            IERC20(deal.token).safeTransferFrom(msg.sender, address(this), deal.amount);
        }

        deal.state = State.Funded;
        deal.fundedAt = uint64(block.timestamp);

        emit DealFunded(dealId, deal.fundedAt);
    }

    /**
     * @notice Liberar fondos al vendedor (solo comprador o después de SLA)
     */
    function releaseFunds(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.state != State.Funded) revert InvalidState();
        
        bool canRelease = msg.sender == deal.buyer || 
                         (block.timestamp > deal.fundedAt + deal.respondBy);
        if (!canRelease) revert Unauthorized();

        deal.state = State.Released;
        _transferFunds(deal, deal.seller);

        emit DealReleased(dealId, block.timestamp);
    }

    /**
     * @notice Solicitar reembolso (solo vendedor)
     */
    function requestRefund(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.state != State.Funded) revert InvalidState();
        if (msg.sender != deal.seller) revert Unauthorized();

        deal.state = State.Refunded;
        _transferFunds(deal, deal.buyer);

        emit DealRefunded(dealId, block.timestamp);
    }

    /**
     * @notice Levantar disputa con evidencia
     */
    function raiseDispute(uint256 dealId, string calldata evidenceHash) external {
        Deal storage deal = deals[dealId];
        if (deal.state != State.Funded) revert InvalidState();
        if (msg.sender != deal.buyer && msg.sender != deal.seller) revert Unauthorized();

        deal.state = State.Disputed;
        evidenceHashes[dealId] = evidenceHash;

        emit DisputeRaised(dealId, msg.sender, evidenceHash);
    }

    /**
     * @notice Resolver disputa con firma (EIP-712)
     * @param dealId ID del deal
     * @param outcome 0=refund, 1=release, 2=split
     * @param nonce Nonce para replay protection
     * @param deadline Deadline de la firma
     * @param signature Firma del árbitro autorizado
     */
    function resolveDispute(
        uint256 dealId,
        uint8 outcome,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert DeadlineExpired();
        
        Deal storage deal = deals[dealId];
        if (deal.state != State.Disputed) revert InvalidState();
        
        // Verificar firma EIP-712
        bytes32 structHash = keccak256(abi.encode(SETTLE_TYPEHASH, dealId, outcome, nonce, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        
        if (signer != owner() || nonces[signer] != nonce) revert InvalidSignature();
        nonces[signer]++;

        deal.state = State.Resolved;

        if (outcome == 0) {
            // Refund al comprador
            _transferFunds(deal, deal.buyer);
        } else if (outcome == 1) {
            // Release al vendedor
            _transferFunds(deal, deal.seller);
        } else if (outcome == 2) {
            // Split 50/50
            _transferSplit(deal);
        }

        emit DisputeResolved(dealId, outcome, signer);
    }

    /**
     * @notice Transferir fondos descontando fees
     */
    function _transferFunds(Deal memory deal, address recipient) internal {
        uint256 feeAmount = (deal.amount * deal.feeBps) / 10000;
        uint256 netAmount = deal.amount - feeAmount;

        if (deal.token == address(0)) {
            if (feeAmount > 0) {
                payable(feeTreasury).transfer(feeAmount);
            }
            payable(recipient).transfer(netAmount);
        } else {
            if (feeAmount > 0) {
                IERC20(deal.token).safeTransfer(feeTreasury, feeAmount);
            }
            IERC20(deal.token).safeTransfer(recipient, netAmount);
        }
    }

    /**
     * @notice Transferir fondos en split 50/50
     */
    function _transferSplit(Deal memory deal) internal {
        uint256 feeAmount = (deal.amount * deal.feeBps) / 10000;
        uint256 netAmount = deal.amount - feeAmount;
        uint256 halfAmount = netAmount / 2;

        if (deal.token == address(0)) {
            if (feeAmount > 0) {
                payable(feeTreasury).transfer(feeAmount);
            }
            payable(deal.buyer).transfer(halfAmount);
            payable(deal.seller).transfer(netAmount - halfAmount);
        } else {
            if (feeAmount > 0) {
                IERC20(deal.token).safeTransfer(feeTreasury, feeAmount);
            }
            IERC20(deal.token).safeTransfer(deal.buyer, halfAmount);
            IERC20(deal.token).safeTransfer(deal.seller, netAmount - halfAmount);
        }
    }

    /**
     * @notice Obtener información del deal
     */
    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }

    /**
     * @notice Actualizar treasury (solo owner)
     */
    function setFeeTreasury(address newTreasury) external onlyOwner {
        feeTreasury = newTreasury;
    }

    /**
     * @notice Emergency withdraw (solo owner, solo en casos extremos)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }
}

