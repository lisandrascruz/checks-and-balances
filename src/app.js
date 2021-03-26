const express = require('express');
const fs = require('fs')
const path = require('path');

const app = express();
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')));

/* Read - GET method */
app.get('/data', (req, res) => {
    const data = getAllData();
    res.send(data);
});

/* Add - POST method */
app.post('/transaction/add', (req, res) => {
    const previousData = getAllData();
    const newData = req.body;

    previousData.transacoes.push(newData);
    previousData.saldo = previousData.saldo + newData.valor;

    saveData(previousData);

    res.send({
        success: true,
        msg: 'Transaction added successfully'
    });
});

/* Util functions */
const getAllData = (() => {
    const jsonData = fs.readFileSync('src/dados.json');
    return JSON.parse(jsonData);
});

const saveData = ((data) => {
    const stringifyData = JSON.stringify(data);
    fs.writeFileSync('src/dados.json', stringifyData);
});
/* util functions ends */

/* Configure the server port */
app.listen(3000, () => {
    console.log('Server runs on port 3000');
});