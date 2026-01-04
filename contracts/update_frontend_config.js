const fs = require('fs');
const path = require('path');

const broadcastPath = path.join(__dirname, 'broadcast/Deploy.s.sol/31337/run-latest.json');
const frontendConfigPath = path.join(__dirname, '../frontend/src/lib/contracts.ts');

const CONTRACT_NAME_MAPPING = {
    'Users': 'USERS_ADDRESS',
    'LandRegistry': 'LAND_REGISTRY_ADDRESS',
    'TransferOwnerShip': 'TRANSFER_OWNERSHIP_ADDRESS'
};

try {
    if (!fs.existsSync(broadcastPath)) {
        console.error('Error: Broadcast file not found at:', broadcastPath);
        console.error('Make sure you have deployed the contracts using: forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
    const newAddresses = {};

    data.transactions.forEach(t => {
        if (t.transactionType === 'CREATE') {
            const configName = CONTRACT_NAME_MAPPING[t.contractName];
            if (configName) {
                newAddresses[configName] = t.contractAddress;
            }
        }
    });

    if (Object.keys(newAddresses).length === 0) {
        console.error('Error: No relevant contract deployments found in broadcast file.');
        process.exit(1);
    }

    let configContent = fs.readFileSync(frontendConfigPath, 'utf8');

    for (const [key, value] of Object.entries(newAddresses)) {
        // Regex to replace: export const KEY = "old_value";
        const regex = new RegExp(`export const ${key} = "[^"]+";`, 'g');
        const replacement = `export const ${key} = "${value}";`;
        
        if (configContent.match(regex)) {
            configContent = configContent.replace(regex, replacement);
            console.log(`Updated ${key} to ${value}`);
        } else {
            console.warn(`Warning: Could not find definition for ${key} in contracts.ts`);
        }
    }

    fs.writeFileSync(frontendConfigPath, configContent);
    console.log('Successfully updated frontend/src/lib/contracts.ts');

} catch (e) {
    console.error('An error occurred:', e.message);
}
