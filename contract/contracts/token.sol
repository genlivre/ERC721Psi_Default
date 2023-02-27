//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
// import "erc721psi/contracts/ERC721Psi.sol"; // token IDが0開始の場合
import "./ERC721Psi.sol"; // token IDが1開始の場合
// import "operator-filter-registry/src/DefaultOperatorFilterer.sol";
import "./operator-filter-registry/src/DefaultOperatorFilterer.sol";

contract TOKEN is
    ERC721Psi,
    ERC2981,
    Ownable,
    ReentrancyGuard,
    DefaultOperatorFilterer
{
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 3333;
    uint256 public constant PRE_PRICE = 0.02 ether;
    uint256 public constant PUB_PRICE = 0.02 ether;

    bool public preSaleStart;
    bool public pubSaleStart;

    uint256 public mintLimit = 1;

    bytes32 public merkleRoot;

    bool private _revealed;
    string private _baseTokenURI;
    string private _unrevealedURI = "https://example.com";

    mapping(address => uint256) public claimed;

    constructor() ERC721Psi("Name", "symbol") {
        _setDefaultRoyalty(owner(), 1000);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override(ERC721Psi)
        returns (string memory)
    {
        if (_revealed) {
            return
                string(abi.encodePacked(ERC721Psi.tokenURI(_tokenId), ".json"));
        } else {
            return _unrevealedURI;
        }
    }

    function pubMint(uint256 _quantity) public payable nonReentrant {
        uint256 supply = totalSupply();
        uint256 cost = PUB_PRICE * _quantity;
        require(pubSaleStart, "Before sale begin.");
        _mintCheck(_quantity, supply, cost);

        claimed[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);
    }

    function checkMerkleProof(bytes32[] calldata _merkleProof)
        public
        view
        returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        return MerkleProof.verifyCalldata(_merkleProof, merkleRoot, leaf);
    }

    function preMint(uint256 _quantity, bytes32[] calldata _merkleProof)
        public
        payable
        nonReentrant
    {
        uint256 supply = totalSupply();
        uint256 cost = PRE_PRICE * _quantity;
        require(preSaleStart, "Before sale begin.");
        _mintCheck(_quantity, supply, cost);

        require(checkMerkleProof(_merkleProof), "Invalid Merkle Proof");

        claimed[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);
    }

    function _mintCheck(
        uint256 _quantity,
        uint256 _supply,
        uint256 _cost
    ) private view {
        require(_supply + _quantity <= MAX_SUPPLY, "Max supply over");
        require(_quantity <= mintLimit, "Mint quantity over");
        require(msg.value >= _cost, "Not enough funds");
        require(
            claimed[msg.sender] + _quantity <= mintLimit,
            "Already claimed max"
        );
    }

    function ownerMint(address _address, uint256 _quantity) public onlyOwner {
        uint256 supply = totalSupply();
        require(supply + _quantity <= MAX_SUPPLY, "Max supply over");
        _safeMint(_address, _quantity);
    }

    // only owner
    function setUnrevealedURI(string calldata _uri) public onlyOwner {
        _unrevealedURI = _uri;
    }

    function setBaseURI(string calldata _uri) external onlyOwner {
        _baseTokenURI = _uri;
    }

    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function setPresale(bool _state) public onlyOwner {
        preSaleStart = _state;
    }

    function setPubsale(bool _state) public onlyOwner {
        pubSaleStart = _state;
    }

    function setMintLimit(uint256 _quantity) public onlyOwner {
        mintLimit = _quantity;
    }

    function reveal(bool _state) public onlyOwner {
        _revealed = _state;
    }


    // 報酬配分（適宜ご変更ください）
    struct ProjectMember {
        address founder;
        address illustrator;
        address developer;
        address marketer;
        address musician;
    }
    ProjectMember private _member;
    function setMemberAddress(
        address _founder,
        address _illustrator,
        address _developer,
        address _marketer,
        address _musician
    ) public onlyOwner {
        _member.founder = _founder;
        _member.illustrator = _illustrator;
        _member.developer = _developer;
        _member.marketer = _marketer;
        _member.musician = _musician;
    }

    function withdraw() external onlyOwner {
        require(
            _member.founder != address(0) &&
                _member.illustrator != address(0) &&
                _member.developer != address(0) &&
                _member.marketer != address(0) &&
                _member.musician != address(0),
            "Please set member address"
        );

        uint256 balance = address(this).balance;
        Address.sendValue(payable(_member.founder), ((balance * 2500) / 10000));
        Address.sendValue(
            payable(_member.illustrator),
            ((balance * 3000) / 10000)
        );
        Address.sendValue(
            payable(_member.developer),
            ((balance * 2000) / 10000)
        );
        Address.sendValue(payable(_member.marketer), ((balance * 1000) / 10000));
        Address.sendValue(payable(_member.musician), ((balance * 1500) / 10000));
    }

    // OperatorFilterer
    function setOperatorFilteringEnabled(bool _state) external onlyOwner {
        operatorFilteringEnabled = _state;
    }

    function setApprovalForAll(address operator, bool approved)
        public
        override
        onlyAllowedOperatorApproval(operator)
    {
        super.setApprovalForAll(operator, approved);
    }

    function approve(address operator, uint256 tokenId)
        public
        override
        onlyAllowedOperatorApproval(operator)
    {
        super.approve(operator, tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // Royality
    function setRoyalty(address _royaltyAddress, uint96 _feeNumerator)
        external
        onlyOwner
    {
        _setDefaultRoyalty(_royaltyAddress, _feeNumerator);
    }

    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(ERC721Psi, ERC2981)
        returns (bool)
    {
        return
            ERC721Psi.supportsInterface(_interfaceId) ||
            ERC2981.supportsInterface(_interfaceId);
    }
}
