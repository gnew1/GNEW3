// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title Delegation (revocable, con expiración, multi‑scope) 
* @author GNEW 
* @notice Registro on-chain de delegaciones por "scope" (bytes32) 
con: 
*         
*         
*         
*         - creación/actualización atómica, - revocación manual, - expiración por timestamp, - resolución de delegado efectivo sin pérdida (fallback al 
propio delegador). 
* 
* Casos de uso: 
*  - Gobernanza: scopes distintos para "TOKEN_VOTES", 
"REPUTATION_VOTES", etc. 
*  - Frontend puede leer `effectiveDelegateOf(...)` para 
mostrar/operar votos. 
* 
* Notas: 
*  - No mueve votos por sí mismo (no llama a `delegate` en IVotes). 
Es un *source of truth* 
 *    que UIs/subgraphs/contadores personalizados pueden usar para 
sincronizar delegaciones 
 *    en los módulos IVotes (o para hacer tally off‑chain). 
 */ 
contract Delegation { 
    // ====== Custom errors (baratas) ====== 
    error ZeroAddress(); 
    error Expired(); 
    error NotOwner(); 
    error SameDelegate(); 
    error ExpiryTooSoon(); 
 
    // ====== Datos ====== 
    struct Record { 
        address delegatee;   // 20 bytes 
        uint64  createdAt;   // 8 
        uint64  expiresAt;   // 8 (0 = sin expiración) 
        // total 36 bytes → 2 slots. Mantener orden para packing 
futuro. 
    } 
 
    // delegator => scope => record 
    mapping(address => mapping(bytes32 => Record)) private 
_delegations; 
 
    // ====== Eventos ====== 
    event Delegated(address indexed delegator, bytes32 indexed scope, 
address indexed delegatee, uint64 expiresAt); 
    event Revoked(address indexed delegator, bytes32 indexed scope, 
address prevDelegatee); 
    event Extended(address indexed delegator, bytes32 indexed scope, 
uint64 newExpiresAt); 
    event Reassigned(address indexed delegator, bytes32 indexed scope, 
address indexed newDelegatee, uint64 newExpiresAt); 
 
    // ====== Vistas ====== 
 
    /// @notice Devuelve la delegación cruda (si existe). Si 
`delegatee=0`, no hay delegación activa. 
    function getDelegation(address delegator, bytes32 scope) external 
view returns (Record memory rec) { 
        rec = _delegations[delegator][scope]; 
    } 
 
    /// @notice Devuelve el delegado efectivo en este instante: si 
expiró o no existe → el propio delegador. 
    function effectiveDelegateOf(address delegator, bytes32 scope) 
public view returns (address effective, bool active, uint64 expiresAt) 
{ 
        Record memory r = _delegations[delegator][scope]; 
        // activo si tiene delegatee != 0 y (expiresAt==0 || now < 
expiresAt) 
        bool isActive = r.delegatee != address(0) && (r.expiresAt == 0 
|| block.timestamp < r.expiresAt); 
        return (isActive ? r.delegatee : delegator, isActive, 
r.expiresAt); 
    } 
 
    /// @notice True si la delegación existe y ya expiró. 
    function isExpired(address delegator, bytes32 scope) external view 
returns (bool) { 
        Record memory r = _delegations[delegator][scope]; 
        return r.delegatee != address(0) && r.expiresAt != 0 && 
block.timestamp >= r.expiresAt; 
    } 
 
    // ====== Mutadores ====== 
 
    /** 
     * @notice Crea o actualiza una delegación (si existe) para un 
`scope`. 
     * @param scope     Identificador lógico (p.ej., 
keccak256("TOKEN_VOTES")). 
     * @param delegatee Destinatario de la delegación. 
     * @param expiresAt Timestamp de expiración (0 = sin expiración). 
     * Reglas: 
     *  - `delegatee != 0` 
     *  - Si `expiresAt != 0`, debe ser futuro y al menos +60s 
(protege misclicks). 
     *  - Si ya había delegación y `delegatee` no cambia → usa 
`extend()` en su lugar. 
     */ 
    function delegate(bytes32 scope, address delegatee, uint64 
expiresAt) external { 
        if (delegatee == address(0)) revert ZeroAddress(); 
        if (expiresAt != 0 && expiresAt <= block.timestamp + 60) 
revert ExpiryTooSoon(); 
 
        Record storage r = _delegations[msg.sender][scope]; 
 
        if (r.delegatee == address(0)) { 
            // nueva delegación 
            r.delegatee = delegatee; 
            r.createdAt = uint64(block.timestamp); 
            r.expiresAt = expiresAt; 
            emit Delegated(msg.sender, scope, delegatee, expiresAt); 
        } else { 
            // actualización existente 
            if (r.delegatee == delegatee) revert SameDelegate(); // 
usa extend() 
            r.delegatee = delegatee; 
            r.expiresAt = expiresAt; 
            emit Reassigned(msg.sender, scope, delegatee, expiresAt); 
        } 
    } 
 
    /** 
     * @notice Extiende/recorta la expiración de una delegación 
existente (no cambia el delegado). 
     * @param scope     Identificador lógico 
     * @param newExpiry Nuevo timestamp (0 = sin expiración) 
     */ 
    function extend(bytes32 scope, uint64 newExpiry) external { 
        Record storage r = _delegations[msg.sender][scope]; 
        if (r.delegatee == address(0)) revert NotOwner(); 
        if (newExpiry != 0 && newExpiry <= r.createdAt) revert 
Expired(); // coherencia temporal 
        r.expiresAt = newExpiry; 
        emit Extended(msg.sender, scope, newExpiry); 
    } 
 
    /** 
     * @notice Revoca la delegación (incluso si ya expiró). El 
efectivo vuelve a ser el propio delegador. 
     */ 
    function revoke(bytes32 scope) external { 
        Record storage r = _delegations[msg.sender][scope]; 
        if (r.delegatee == address(0)) revert NotOwner(); 
        address prev = r.delegatee; 
        delete _delegations[msg.sender][scope]; 
        emit Revoked(msg.sender, scope, prev); 
    } 
} 
 
