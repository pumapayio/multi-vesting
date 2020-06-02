const timeTravel = function (time) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [ time ], // 86400 is num seconds in day
            id: new Date().getTime()
        }, (error, result) => {
            if (error) {
                return reject(error);
            }
            web3.currentProvider.send({
                jsonrpc: '2.0',
                method: 'evm_mine',
                params: [],
                id: new Date().getSeconds()
            }, (err, res) => {
                if (err) {
                    return reject(err);
                }
                return resolve(res);
            });
        });
    });
};

const currentBlockTime = async function () {
    const p = new Promise((resolve, reject) => {
        web3.eth.getBlock('latest', (err, res) => {
            if (err) {
                return reject(err);
            }
            return resolve(res.timestamp);
        });
    });

    return p;
};

module.exports = {
    timeTravel,
    currentBlockTime
};
