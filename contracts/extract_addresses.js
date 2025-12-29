const fs = require('fs');
const path = 'broadcast/Deploy.s.sol/31337/run-latest.json';
try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    console.log("---CAPTURED ADDRESSES---");
    data.transactions.forEach(t => {
        if (t.transactionType === 'CREATE') {
            console.log(`${t.contractName}: ${t.contractAddress}`);
        }
    });
    console.log("---END---");
} catch (e) {
    console.error("Error reading file:", e);
}
