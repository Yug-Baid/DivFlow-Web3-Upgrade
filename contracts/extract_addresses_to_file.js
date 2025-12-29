const fs = require('fs');
const path = 'broadcast/Deploy.s.sol/31337/run-latest.json';
try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    let out = "";
    data.transactions.forEach(t => {
        if (t.transactionType === 'CREATE') {
            out += `${t.contractName}: ${t.contractAddress}\n`;
        }
    });
    fs.writeFileSync('address_output.txt', out);
} catch (e) {
    fs.writeFileSync('address_output.txt', "ERROR: " + e.message);
}
