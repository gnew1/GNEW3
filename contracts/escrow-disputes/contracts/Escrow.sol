
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
    bytes32 public constant SETTLE_TYPEHASH = keccak

Tú dijiste:
Como IA programadora de GNEW, ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt" empezando en N321 (N320 se ejecutó en la interacción actual) y avanza +1 en cada ejecución hasta N340, sin repetirte. Para cada prompt: 1) entrega exactamente lo pedido con código listo para producción; 2) empieza la respuesta con la RUTA COMPLETA del archivo de salida y debajo el código en el lenguaje indicado; 3) mantén coherencia con el monorepo (Node/TypeScript predominante, backend principal app.ts) y convenciones establecidas; 4) incluye pruebas y scripts de integración cuando proceda; 5) evita texto superfluo fuera de rutas+código salvo breves notas de uso; 6) conserva y actualiza un puntero interno de progreso para continuar en N+1 y detenerse al llegar a N340.
ChatGPT Plus
Pensó durante 56s

