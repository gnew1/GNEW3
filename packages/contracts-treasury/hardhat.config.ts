import { HardhatUserConfig } from "hardhat/config"; 
import "@nomicfoundation/hardhat-toolbox"; 
 
const config: HardhatUserConfig = { 
  solidity: { 
    version: "0.8.24", 
    settings: { optimizer: { enabled: true, runs: 200 } } 
  }, 
  networks: { 
    hardhat: {}, 
    network: { 
      url: process.env.RPC_URL || "", 
      accounts: process.env.SIGNER_PK ? [process.env.SIGNER_PK] : [] 
    } 
  } 
}; 
export default config; 
 
 
./packages/contracts-treasury/contracts/TreasuryPolicyGuard.
 sol 
// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
 
/** 
 * Minimal Safe Guard enforcing: 
 * - Block delegatecall 
 * - Time-window (UTC emulated by block.timestamp heuristics; 
operationally you should rely on OPA off-chain for precise UTC window) 
 * - Per-fund per-role caps via on-chain params (native only) 
 * - Emergency pause by guardian 
 * 
 * Note: This guard complements OPA off-chain checks. It enforces 
baseline safety. 
 */ 
 
interface ISafe { 
  function getOwners() external view returns (address[] memory); 
  function getThreshold() external view returns (uint256); 
} 
 
interface ISafeGuard { 
  function checkTransaction( 
    address to, uint256 value, bytes calldata data, uint8 operation, 
    uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address 
gasToken, 
    address payable refundReceiver, bytes memory signatures, address 
msgSender 
  ) external; 
  function checkAfterExecution(bytes32 txHash, bool success) external; 
} 
 
contract TreasuryPolicyGuard is ISafeGuard { 
  error Paused(); 
  error DelegatecallForbidden(); 
  error AmountExceedsCap(); 
  error UntrustedToken(); 
  error OutsideWindow(); 
 
  event PausedSet(bool paused); 
  event RoleCapSet(bytes32 fund, bytes32 role, uint256 capWei); 
  event TimeWindowSet(uint8 startHourUTC, uint8 endHourUTC); 
 
  address public immutable safe; 
  address public guardian; 
  bool public paused; 
 
  // UTC hours [start, end) approved window 
  uint8 public startHourUTC = 8; 
  uint8 public endHourUTC = 20; 
 
  // fund => role => native cap (wei) 
  mapping(bytes32 => mapping(bytes32 => uint256)) public nativeCaps; 
 
  // simple token whitelist toggle (false by default) 
  mapping(address => bool) public tokenAllowed; 
 
  modifier onlyGuardian() { 
    require(msg.sender == guardian, "not guardian"); 
    _; 
  } 
 
  constructor(address _safe, address _guardian) { 
    safe = _safe; 
    guardian = _guardian; 
  } 
 
  function setPaused(bool v) external onlyGuardian { 
    paused = v; 
    emit PausedSet(v); 
  } 
 
  function setTimeWindow(uint8 startHour, uint8 endHour) external 
onlyGuardian { 
    require(startHour < 24 && endHour <= 24 && startHour < endHour, 
"bad window"); 
    startHourUTC = startHour; 
    endHourUTC = endHour; 
    emit TimeWindowSet(startHour, endHour); 
  } 
 
  function setNativeCap(bytes32 fund, bytes32 role, uint256 capWei) 
external onlyGuardian { 
    nativeCaps[fund][role] = capWei; 
    emit RoleCapSet(fund, role, capWei); 
  } 
 
  function setTokenAllowed(address token, bool allowed) external 
onlyGuardian { 
    tokenAllowed[token] = allowed; 
  } 
 
  function rotateGuardian(address newGuardian) external onlyGuardian { 
    guardian = newGuardian; 
  } 
 
  // naive hour extraction from timestamp relative to UTC; production 
should rely mainly on OPA for precise HR windows 
  function _hourUTC() internal view returns (uint8) { 
    // 3600 = seconds per hour 
    return uint8((block.timestamp / 3600) % 24); 
  } 
 
  function _requireWindow() internal view { 
    uint8 h = _hourUTC(); 
    if (h < startHourUTC || h >= endHourUTC) revert OutsideWindow(); 
  } 
 
  /// @dev Called by Safe before exec 
  function checkTransaction( 
    address to, uint256 value, bytes calldata data, uint8 operation, 
    uint256, uint256, uint256, address, address payable, bytes memory, 
address 
  ) external override { 
    if (paused) revert Paused(); 
    if (operation == 1) revert DelegatecallForbidden(); // 
delegatecall 
 
    // If ERC20 transfer (heuristic), ensure token whitelist 
    if (data.length >= 4) { 
      bytes4 sel; 
      assembly { sel := shr(224, calldataload(data.offset)) } 
      // transfer(address,uint256) or transferFrom 
      if (sel == 0xa9059cbb || sel == 0x23b872dd) { 
        require(tokenAllowed[to], "token not allowed"); 
      } 
    } 
 
    // Native limit baseline (optional): require within window unless 
owners are EXEC (not known on-chain) 
    _requireWindow(); 
 
    // Optional baseline cap: "operativo/FINANCE_OPS" etc. (encoded 
off-chain; on-chain fallback via single fund/role) 
    // For simplicity, enforce a single global cap tag: 
fund=keccak256("operativo"), role=keccak256("FINANCE_OPS") 
    // Teams can manage more detailed caps off-chain with OPA. 
    uint256 cap = 
nativeCaps[keccak256("operativo")][keccak256("FINANCE_OPS")]; 
    if (cap > 0 && value > cap) revert AmountExceedsCap(); 
  } 
 
  function checkAfterExecution(bytes32, bool) external override { 
    // no-op; events could be emitted for audit if desired 
  } 
} 
 
 
