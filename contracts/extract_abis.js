const fs = require('fs');

const contracts = [
    { name: 'LandRegistry', path: 'out/LandRegistry.sol/LandRegistry.json' },
    { name: 'Users', path: 'out/Users.sol/Users.json' },
    { name: 'TransferOwnerShip', path: 'out/TransferOwnerShip.sol/TransferOwnerShip.json' }
];

const abis = {};

contracts.forEach(c => {
    try {
        const content = JSON.parse(fs.readFileSync(c.path, 'utf8'));
        abis[c.name] = content.abi;
    } catch (e) {
        console.error(`Error reading ${c.name}:`, e.message);
    }
});

fs.writeFileSync('extracted_abis.json', JSON.stringify(abis, null, 2));
console.log('ABIs extracted to extracted_abis.json');
