// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
/** 
* BudgetVault — custodia de fondos y ejecución dentro de límites por 
trimestre/categoría. 
* - Mantiene allowances trimestrales por categoría para cada Budget 
(vinculado a BudgetRegistry). 
* - Sólo "controller" del presupuesto (p.ej., Safe de tesorería) o 
spenders delegados 
*   pueden ejecutar gastos, y NUNCA por encima del allowance 
disponible. 
* - Tranches: liberación por lote desde el Governor/Timelock hacia 
allowance (no transfiere a externos). 
* - Kill-switch (pause) por Governor. 
*/ 
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import {SafeERC20} from 
"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; 
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; 
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"; 
import {BudgetRegistry} from "./BudgetRegistry.sol"; 
contract BudgetVault is Pausable, Ownable { 
using SafeERC20 for IERC20; 
struct AllowanceKey { uint256 budgetId; uint8 quarter; bytes32 
category; } 
 
    BudgetRegistry public registry; 
    address public governor; // Timelock/Governor 
 
    // allowances[budgetId][quarter][category] => amount 1e18 en token 
del budget 
    mapping(uint256 => mapping(uint8 => mapping(bytes32 => uint256))) 
public allowances; 
    // spenders delegados por budgetId (además del controller del 
budget en el registry) 
    mapping(uint256 => mapping(address => bool)) public isSpender; 
 
    event GovernorSet(address indexed gov); 
    event SpenderSet(uint256 indexed id, address indexed spender, bool 
enabled); 
    event TrancheReleased(uint256 indexed id, uint8 quarter, bytes32 
indexed category, uint256 amount); 
    event Spent(uint256 indexed id, uint8 quarter, bytes32 indexed 
category, address indexed to, uint256 amount, address token); 
    event PausedByGovernor(address indexed gov); 
    event UnpausedByOwner(address indexed owner); 
 
    modifier onlyGovernor() { require(msg.sender == governor || 
msg.sender == owner(), "not governor"); _; } 
 
    constructor(address _registry, address _governor) 
Ownable(msg.sender) { 
        registry = BudgetRegistry(_registry); 
        governor = _governor == address(0) ? msg.sender : _governor; 
        emit GovernorSet(governor); 
    } 
 
    function setGovernor(address _gov) external onlyOwner { governor = 
_gov; emit GovernorSet(_gov); } 
    function setSpender(uint256 budgetId, address spender, bool 
enabled) external onlyGovernor { 
        isSpender[budgetId][spender] = enabled; 
        emit SpenderSet(budgetId, spender, enabled); 
    } 
 
    function pauseAll() external onlyGovernor { _pause(); emit 
PausedByGovernor(msg.sender); } 
    function unpauseAll() external onlyOwner { _unpause(); emit 
UnpausedByOwner(msg.sender); } 
 
    // --- Funding: transferencias al Vault (token según budget) se 
hacen off-chain / Safe -> Vault --- 
    receive() external payable {} 
 
    // --- Tranches (liberación a allowance) --- 
 
    function releaseTranche( 
        uint256 budgetId, 
        uint8 quarter, 
        bytes32[] calldata categories, 
        uint256[] calldata amounts 
    ) external onlyGovernor whenNotPaused { 
        require(categories.length == amounts.length, "len"); 
        (, , , , ) = registry.getStatus(budgetId); // existencia 
        for (uint256 i=0;i<categories.length;i++) { 
            allowances[budgetId][quarter][categories[i]] += 
amounts[i]; 
            emit TrancheReleased(budgetId, quarter, categories[i], 
amounts[i]); 
        } 
    } 
 
    // --- Spend dentro de allowance (transfiere tokens a 
proveedores/beneficiarios) --- 
 
    function _isAuthorized(uint256 budgetId) internal view returns 
(bool) { 
        (BudgetRegistry.Status st, , , address controller, ) = 
registry.getStatus(budgetId); 
        if (st != BudgetRegistry.Status.Active) return false; 
        return (msg.sender == controller || 
isSpender[budgetId][msg.sender]); 
    } 
 
    function spendERC20( 
        uint256 budgetId, 
        uint8 quarter, 
        bytes32 category, 
        address token, 
        address to, 
        uint256 amount 
    ) external whenNotPaused { 
        require(_isAuthorized(budgetId), "not authorized"); 
        // validar que token coincide con el budget 
        (, , address tokenOfBudget, , ) = 
registry.getStatus(budgetId); 
        require(tokenOfBudget == token, "wrong token"); 
        uint256 avail = allowances[budgetId][quarter][category]; 
        require(avail >= amount, "allowance"); 
        allowances[budgetId][quarter][category] = avail - amount; 
 
        IERC20(token).safeTransfer(to, amount); 
 
        // reportar a Registry como "actual" 
        registry.increaseActual(budgetId, quarter, category, amount); 
        emit Spent(budgetId, quarter, category, to, amount, token); 
    } 
 
    // (opcional) ETH nativo si token==address(0) 
    function spendETH( 
        uint256 budgetId, 
        uint8 quarter, 
        bytes32 category, 
        address payable to, 
        uint256 amount 
    ) external whenNotPaused { 
        require(_isAuthorized(budgetId), "not auth"); 
        (, , address tokenOfBudget, , ) = 
registry.getStatus(budgetId); 
        require(tokenOfBudget == address(0), "not ETH budget"); 
        uint256 avail = allowances[budgetId][quarter][category]; 
        require(avail >= amount, "allow"); 
        allowances[budgetId][quarter][category] = avail - amount; 
        (bool ok, ) = to.call{value: amount}(""); 
        require(ok, "eth xfer"); 
        registry.increaseActual(budgetId, quarter, category, amount); 
        emit Spent(budgetId, quarter, category, to, amount, 
address(0)); 
    } 
} 
 
 
