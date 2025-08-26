// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title GnewGovToken (governance, base) 
* @author GNEW 
* @notice ERC20 de gobernanza con control de roles, pausa, CAP de 
suministro y faucet para testnets. 
* @dev Stack: OpenZeppelin ERC20 + AccessControl + Pausable. UUPS 
opcional en archivo aparte. 
*      
Eventos: Minted, Burned (Paired con Pausable de OZ que ya 
emite Paused/Unpaused). 
*/ 
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol"; 
import {ERC20Burnable} from 
"@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; 
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; 
import {AccessControl} from 
"@openzeppelin/contracts/access/AccessControl.sol"; 
contract GnewGovToken is ERC20, ERC20Burnable, Pausable, AccessControl 
{ 
    /// @notice Rol que puede pausar el contrato. 
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); 
    /// @notice Rol que puede mintear. 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); 
 
    /// @notice tope máximo de suministro (cap). 
    uint256 public immutable MAX_SUPPLY; 
    /// @notice monto máximo de faucet por reclamo. 
    uint256 public immutable FAUCET_AMOUNT; 
    /// @notice cooldown entre reclamos de faucet por dirección. 
    uint256 public immutable FAUCET_COOLDOWN; 
    /// @notice timestamp del último reclamo por address. 
    mapping(address => uint256) public lastFaucetAt; 
 
    /// @notice Emisión de tokens. 
    event Minted(address indexed to, uint256 amount, address indexed 
by); 
    /// @notice Quema de tokens. 
    event Burned(address indexed from, uint256 amount, address indexed 
by); 
 
    /** 
     * @param name_ Nombre ERC20 
     * @param symbol_ Símbolo ERC20 
     * @param admin Dirección admin con roles 
     * @param initialSupply Suministro inicial (18 decimales) 
     * @param maxSupply Cap máximo (18 decimales, >= initialSupply) 
     * @param faucetAmount Cantidad por faucet (18 decimales; puede 
ser 0 para desactivar reclamos) 
     * @param faucetCooldown Cooldown en segundos entre reclamos 
     */ 
    constructor( 
        string memory name_, 
        string memory symbol_, 
        address admin, 
        uint256 initialSupply, 
        uint256 maxSupply, 
        uint256 faucetAmount, 
        uint256 faucetCooldown 
    ) ERC20(name_, symbol_) { 
        require(admin != address(0), "admin=0"); 
        require(maxSupply > 0, "cap=0"); 
        require(maxSupply >= initialSupply, "cap<initial"); 
        MAX_SUPPLY = maxSupply; 
        FAUCET_AMOUNT = faucetAmount; 
        FAUCET_COOLDOWN = faucetCooldown; 
 
        _grantRole(DEFAULT_ADMIN_ROLE, admin); 
        _grantRole(PAUSER_ROLE, admin); 
        _grantRole(MINTER_ROLE, admin); 
 
        if (initialSupply > 0) { 
            _mint(admin, initialSupply); 
            emit Minted(admin, initialSupply, msg.sender); 
        } 
    } 
 
    /// @notice Pausa transferencias (solo rol). 
    function pause() external onlyRole(PAUSER_ROLE) { 
        _pause(); 
        // OZ emite Paused(admin) automáticamente 
    } 
 
    /// @notice Reactiva transferencias (solo rol). 
    function unpause() external onlyRole(PAUSER_ROLE) { 
        _unpause(); 
        // OZ emite Unpaused(admin) 
    } 
 
    /// @notice Mintea tokens respetando el CAP. 
    function mint(address to, uint256 amount) external 
onlyRole(MINTER_ROLE) { 
        _safeMint(to, amount); 
        emit Minted(to, amount, msg.sender); 
    } 
 
    /// @notice Reclamo de faucet en testnets (bloqueado en mainnets). 
    /// @dev Requiere que la red no sea mainnet ETH (1) ni Polygon mainnet (137). 
    function faucet() external whenNotPaused { 
        require(_isTestnet(), "faucet:mainnet-blocked"); 
        require(FAUCET_AMOUNT > 0, "faucet:disabled"); 
        uint256 last = lastFaucetAt[msg.sender]; 
        require(block.timestamp >= last + FAUCET_COOLDOWN, 
"faucet:cooldown"); 
        lastFaucetAt[msg.sender] = block.timestamp; 
        _safeMint(msg.sender, FAUCET_AMOUNT); 
        emit Minted(msg.sender, FAUCET_AMOUNT, address(this)); 
    } 
 
    /// @dev Override de ERC20Burnable
    function burn(uint256 value) public override whenNotPaused { 
        super.burn(value); 
        emit Burned(msg.sender, value, msg.sender); 
    } 
 
    /// @dev Override de ERC20Burnable
    function burnFrom(address account, uint256 value) public override 
whenNotPaused { 
        super.burnFrom(account, value); 
        emit Burned(account, value, msg.sender); 
    } 
 
    /// @dev Hook de pausado. 
    function _update(address from, address to, uint256 value) internal 
override { 
        require(!paused(), "paused"); 
        super._update(from, to, value); 
    } 
 
    function _isTestnet() internal view returns (bool) { 
        uint256 id = block.chainid; 
    // permitir Holesky(17000), Goerli(5), Sepolia(11155111), Polygon Amoy(80002), Anvil(31337) etc. 
        if (id == 1 || id == 137) return false; 
        return true; 
    } 
 
    function _safeMint(address to, uint256 amount) internal { 
        require(totalSupply() + amount <= MAX_SUPPLY, "cap exceeded"); 
        _mint(to, amount); 
    } 
 
    // AccessControl interfaz 
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    { 
        return super.supportsInterface(interfaceId); 
    } 
} 
 
