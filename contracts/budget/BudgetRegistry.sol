// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.20; 
/** 
 * GNEW N108 — Presupuestos DAO 
 * - Registro on-chain de presupuestos anuales/quarterly con 
categorías. 
 * - Estados: Draft → Approved → Active → Closed. 
 * - Reforecast versionado por trimestre y categoría. 
 * - Integración: sólo Governor/Timelock puede aprobar, reforecastear 
y cerrar. 
 * - Eventos exhaustivos para dashboard/KPIs. 
 * 
 * NOTA: La ejecución de pagos y límites por trimestre/categoría 
 *       se hacen en BudgetVault.sol (este contrato NO mueve fondos). 
 */ 
 
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"; 
 
contract BudgetRegistry is Ownable { 
    enum Status { Draft, Approved, Active, Closed } 
 
    struct QuarterPlan { 
        // presupuesto planificado por categoría (id => amount 1e18) 
        mapping(bytes32 => uint256) byCategory; 
        // suma planificada del trimestre 
        uint256 total; 
    } 
 
    struct QuarterActual { 
        // gasto ejecutado por categoría (id => amount 1e18) (feed 
desde BudgetVault) 
        mapping(bytes32 => uint256) byCategory; 
        uint256 total; 
    } 
 
    struct Budget { 
        uint256 fiscalYear;          // p.ej. 2025 
        address token;               // moneda base del budget (ERC20) 
(address(0) = ETH) 
        Status status; 
        string  metadataCID;         // IPFS/Arweave CID con detalle 
(plantilla firmada) 
        address controller;          // Safe/tesorería operativa 
(spender lógico) 
        // quarters 0..3 = Q1..Q4 
        mapping(uint8 => QuarterPlan) plan; 
        mapping(uint8 => QuarterActual) actual; 
        // versiones de reforecast por trimestre (incrementan con cada 
update) 
        mapping(uint8 => uint32) reforecastVersion; 
        // categorías declaradas (set) 
        mapping(bytes32 => bool) categories; 
    } 
 
    address public governor; // Governor/Timelock (permiso para 
estado/aprobaciones) 
    uint256 public budgetsCount; 
    mapping(uint256 => Budget) private _budgets; 
 
    // --- Eventos --- 
    event GovernorSet(address indexed gov); 
    event BudgetCreated(uint256 indexed id, uint256 fiscalYear, 
address token, address controller, string cid); 
    event CategoryAdded(uint256 indexed id, bytes32 indexed catId, 
string name); 
    event PlanSet(uint256 indexed id, uint8 q, bytes32 indexed catId, 
uint256 amount); 
    event Approved(uint256 indexed id); 
    event Activated(uint256 indexed id); 
    event Closed(uint256 indexed id); 
    event Reforecast(uint256 indexed id, uint8 q, uint32 version, 
bytes32 indexed catId, uint256 newAmount, string reason); 
    event ActualIncreased(uint256 indexed id, uint8 q, bytes32 indexed 
catId, uint256 delta, address indexed by); 
 
    modifier onlyGovernor() { require(msg.sender == governor || 
msg.sender == owner(), "not governor"); _; } 
 
    constructor(address _gov) Ownable(msg.sender) { 
        governor = _gov == address(0) ? msg.sender : _gov; 
        emit GovernorSet(governor); 
    } 
 
    function setGovernor(address _gov) external onlyOwner { 
        governor = _gov; 
        emit GovernorSet(_gov); 
    } 
 
    // --- Crear presupuesto (Draft) --- 
 
    function createBudget( 
        uint256 fiscalYear, 
        address token, 
        address controller, 
        string calldata metadataCID, 
        bytes32[] calldata categoryIds, 
        string[] calldata categoryNames 
    ) external onlyGovernor returns (uint256 id) { 
        require(categoryIds.length == categoryNames.length, "len"); 
        id = budgetsCount++; 
        Budget storage b = _budgets[id]; 
        b.fiscalYear = fiscalYear; 
        b.token = token; 
        b.status = Status.Draft; 
        b.metadataCID = metadataCID; 
        b.controller = controller; 
 
        emit BudgetCreated(id, fiscalYear, token, controller, 
metadataCID); 
        for (uint256 i = 0; i < categoryIds.length; i++) { 
            _addCategory(id, categoryIds[i], categoryNames[i]); 
        } 
    } 
 
    function _addCategory(uint256 id, bytes32 catId, string memory 
name) internal { 
        Budget storage b = _budgets[id]; 
        require(!b.categories[catId], "exists"); 
        b.categories[catId] = true; 
        emit CategoryAdded(id, catId, name); 
    } 
 
    // Añadir categorías nuevas antes de activar 
    function addCategories(uint256 id, bytes32[] calldata catIds, 
string[] calldata names) external onlyGovernor { 
        require(catIds.length == names.length, "len"); 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Draft || b.status == 
Status.Approved, "bad status"); 
        for (uint256 i = 0; i < catIds.length; i++) { 
            _addCategory(id, catIds[i], names[i]); 
        } 
    } 
 
    // Planificación por trimestre/categoría (1e18) 
    function setPlan(uint256 id, uint8 quarterIdx /*0..3*/, bytes32 
catId, uint256 amount) external onlyGovernor { 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Draft || b.status == 
Status.Approved, "bad status"); 
        require(b.categories[catId], "unknown cat"); 
        QuarterPlan storage qp = b.plan[quarterIdx]; 
        // ajustar total 
        uint256 prev = qp.byCategory[catId]; 
        if (amount >= prev) { qp.total += (amount - prev); } 
        else { qp.total -= (prev - amount); } 
        qp.byCategory[catId] = amount; 
        emit PlanSet(id, quarterIdx, catId, amount); 
    } 
 
    function approve(uint256 id) external onlyGovernor { 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Draft, "not draft"); 
        b.status = Status.Approved; 
        emit Approved(id); 
    } 
 
    function activate(uint256 id) external onlyGovernor { 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Approved, "not approved"); 
        b.status = Status.Active; 
        emit Activated(id); 
    } 
 
    function close(uint256 id) external onlyGovernor { 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Active || b.status == 
Status.Approved, "bad status"); 
        b.status = Status.Closed; 
        emit Closed(id); 
    } 
 
    // Reforecast (versionado) por trimestre/categoría 
    function reforecast(uint256 id, uint8 q, bytes32 catId, uint256 
newAmount, string calldata reason) external onlyGovernor { 
        Budget storage b = _budgets[id]; 
        require(b.status == Status.Active || b.status == 
Status.Approved, "bad status"); 
        require(b.categories[catId], "unknown cat"); 
        b.reforecastVersion[q] += 1; 
        QuarterPlan storage qp = b.plan[q]; 
        uint256 prev = qp.byCategory[catId]; 
        if (newAmount >= prev) { qp.total += (newAmount - prev); } 
        else { qp.total -= (prev - newAmount); } 
        qp.byCategory[catId] = newAmount; 
        emit Reforecast(id, q, b.reforecastVersion[q], catId, 
newAmount, reason); 
    } 
 
    // --- Lectura (para dashboards/servicios) --- 
 
    function getStatus(uint256 id) external view returns (Status, 
uint256 fiscalYear, address token, address controller, string memory 
cid) { 
        Budget storage b = _budgets[id]; 
        return (b.status, b.fiscalYear, b.token, b.controller, 
b.metadataCID); 
    } 
 
    function getPlan(uint256 id, uint8 q, bytes32 catId) external view 
returns (uint256) { 
        return _budgets[id].plan[q].byCategory[catId]; 
    } 
 
    function getPlanTotal(uint256 id, uint8 q) external view returns 
(uint256) { 
        return _budgets[id].plan[q].total; 
    } 
 
    function getActual(uint256 id, uint8 q, bytes32 catId) external 
view returns (uint256) { 
        return _budgets[id].actual[q].byCategory[catId]; 
    } 
 
    function getActualTotal(uint256 id, uint8 q) external view returns 
(uint256) { 
        return _budgets[id].actual[q].total; 
    } 
 
    // --- Hook desde BudgetVault para reflejar gasto real --- 
 
    function increaseActual(uint256 id, uint8 q, bytes32 catId, 
uint256 delta) external { 
        // BudgetVault debe ser autorizado a llamar (governor 
establece como owner o via proxy-permissions si se usa OZ 
AccessControl) 
        require(msg.sender == owner() || msg.sender == governor, "not 
authorized"); 
        Budget storage b = _budgets[id]; 
b.actual[q].byCategory[catId] += delta; 
b.actual[q].total += delta; 
emit ActualIncreased(id, q, catId, delta, msg.sender); 
} 
} 
