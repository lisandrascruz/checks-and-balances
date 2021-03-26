const Currency = {
    getPreviousValue() {
        const value = document.getElementById('value').value;
        return this.formatInputValue(value);
    },

    formateOutputValue(value) {
        const price = Math.abs(Number(value));
        const isNegative = value < 0;

        const formattedPrice = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(price);

        return [isNegative, formattedPrice];
    },

    formatInputValue(value) {
        const receivedValue = value || '0.00';
        let newValue = receivedValue.replace(',', '.');

        newValue = newValue.replace(/[^0-9.]/g, '');
        return parseFloat(newValue);
    }

}

const Utils = {
    formateValueDate(value) {
        const fullDate = new Date(value);
        return fullDate.toLocaleDateString('pt-BR');
    },

    generateUUID() {
        let timeNow = new Date().getTime();
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (charactere) {
            let randomValue = (timeNow + Math.random() * 16) % 16 | 0;
            timeNow = Math.floor(timeNow / 16);
            return (charactere == 'x' ? randomValue : (randomValue & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }
}

const Transaction = function (type, bruteValue, description) {

    this.verifyEmptyFields = (optionTransaction, bruteValue, description) => {
        return (!!optionTransaction && !!description && !!bruteValue);
    }

    if (this.verifyEmptyFields(type, bruteValue, description)) {
        this.tipo = type;
        this.valor = type === 'DEPOSITO' ? bruteValue : bruteValue * -1;
        this.descricao = description;
        this.atualizadoEm = Date.now();
        this.id = Utils.generateUUID();
    } else throw new Error('All fields need to be filled, please check and try again.');
}

const TransactionService = {

    async add() {
        const optionTransactionDocument = document.querySelector('input[name="option-add"]:checked');
        const descriptionDocument = document.getElementById('description');
        const bruteValueDocument = document.getElementById('value');

        const optionTransaction = !!optionTransactionDocument ? optionTransactionDocument.value : '';
        const description = !!descriptionDocument ? descriptionDocument.value : '';
        const bruteValue = !!bruteValueDocument ? Currency.formatInputValue(bruteValueDocument.value) : 0;

        try {
            const balanceAtual = Storage.getBalance();
            const transaction = new Transaction(optionTransaction, bruteValue, description);

            this.hasEnoughBalance(balanceAtual, transaction.valor);

            await API.addNewTransaction(transaction);
            DOM.clearTransactions();
            await App.refresh();

            DOM.clearFormFilterTransaction();
            DOM.clearFormNewTransaction();

        } catch (e) {
            alert(e.message);
        }
    },

    hasEnoughBalance(balance, value) {
        if ((balance + value) < 0) throw new Error('You do not have enough balance to carry out this operation.')
    },

    setAllTransactions() {
        const transactions = Storage.getTransactions();
        DOM.setTransactions(transactions);
    },

    filterByWithdrawals(list) {
        return this.filterType(list, 'SAQUE');
    },

    filterByDeposit(list) {
        return this.filterType(list, 'DEPOSITO');
    },

    filterType(list, isType) {
        const filteredList = list.filter((transaction) => {
            const validateType = transaction.tipo === isType || false;
            return validateType;
        });
        return filteredList;
    },

    filterByDescription(list, description) {
        const filteredList = list.filter((transaction) => {
            let descriptionValidated = description.length > 0 ? description.toUpperCase() : '';
            const validateDescription = (transaction.descricao.toUpperCase()).search(descriptionValidated) === -1 ? false : true;

            return validateDescription;
        });

        return filteredList;
    },

    filterTransactions(description, isDeposit, isWithdrawals) {
        const listTransactions = Storage.getTransactions();
        let filteredList = [];

        if ((!isWithdrawals && !isDeposit) || (isWithdrawals && isDeposit)) {
            filteredList = listTransactions;
        }

        if (isDeposit && !isWithdrawals) {
            filteredList = this.filterByDeposit(listTransactions);
        }

        if (isWithdrawals && !isDeposit) {
            filteredList = this.filterByWithdrawals(listTransactions);
        }

        if (description !== '') {
            filteredList = this.filterByDescription(filteredList, description);
        }

        filteredList.length ? DOM.setTransactions(filteredList) : DOM.setTransactions(listTransactions);
    },
}

const DOM = {
    transactionsContainer: document.querySelector('#data-table tbody'),

    filterTransactions() {
        const description = document.getElementById('description-filter').value || true;
        const isDeposit = document.querySelector('input[value="DEPOSITO-FILTER"]:checked') ? true : false;
        const isWithdrawal = document.querySelector('input[value="SAQUE-FILTER"]:checked') ? true : false;

        TransactionService.filterTransactions(description, isDeposit, isWithdrawal);
    },

    clearTransactions() {
        DOM.transactionsContainer.innerHTML = '';
    },

    setTransactions(transactions) {
        DOM.clearTransactions();

        transactions.forEach((transaction) => {
            const tr = document.createElement('tr');
            tr.innerHTML = DOM.innerHTMLTransaction(transaction);

            DOM.transactionsContainer.appendChild(tr);
        });
    },

    innerHTMLTransaction(transaction) {
        const orientation = Currency.formateOutputValue(transaction.valor)[0] ? 'left' : 'right';
        const altTransaction = orientation === 'left' ? 'Expense' : 'Income';
        const value = Currency.formateOutputValue(transaction.valor || 0)[1];

        const html = `
        <th>
            <p>
                <input type="image" src="./assets/icons/arrow-${orientation}.svg" alt=${altTransaction}> ${transaction.descricao} • ${Utils.formateValueDate(transaction.atualizadoEm)} • ${value}
            </p>
        </th>
        `;

        return html;
    },

    setBalance() {
        const balance = Storage.getBalance();
        document.getElementById('balance').textContent = Currency.formateOutputValue(balance)[1];
    },

    incrementValue() {
        this.calculateValue(1.00);
    },

    decrementValue() {
        this.calculateValue(-1.00);
    },

    calculateValue(value) {
        let previousValue = Currency.getPreviousValue();
        previousValue += value;

        const actualValue = Currency.formateOutputValue(previousValue)[1];

        document.getElementById('value').value = actualValue;
    },

    clearFormNewTransaction() {
        const price = document.getElementById('value');
        const description = document.getElementById('description');
        const typeTransaction = document.querySelector('input[name="option-add"]:checked');

        !!price ? price.value = 'R$ 0,00' : price;
        !!description ? description.value = '' : description;
        !!typeTransaction ? typeTransaction.checked = false : typeTransaction;
    },

    clearFormFilterTransaction() {
        const description = document.getElementById('description-filter');
        const inputWithdrawals = document.querySelector('input[value="SAQUE-FILTER"]:checked');
        const inputDeposit = document.querySelector('input[value="DEPOSITO-FILTER"]:checked');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');

        !!description ? description.value = '' : description;
        !!inputWithdrawals ? inputWithdrawals.checked = false : inputWithdrawals;
        !!inputDeposit ? inputDeposit.checked = false : inputDeposit;
        !!startDate ? startDate.value = '' : startDate;
        !!endDate ? endDate.value = '' : endDate;
    }
}

const Storage = {
    getBalance() {
        return parseFloat(localStorage.getItem('checksAndBalances:balance')) || 0;
    },

    getTransactions() {
        return JSON.parse(localStorage.getItem('checksAndBalances:transactions')) || [];
    },

    set(balance, transactions) {
        localStorage.setItem('checksAndBalances:balance', balance);
        localStorage.setItem('checksAndBalances:transactions', JSON.stringify(transactions));
    }
}

const API = {
    myRequest: 'http://localhost:3000',

    async getAllData() {
        await fetch(this.myRequest + '/data')
            .then(response => response.json())
            .then(data => {
                Storage.set(data.saldo, data.transacoes.reverse());
            });

    },

    async addNewTransaction(transaction) {
        await fetch(this.myRequest + '/transaction/add', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
        });
    },
}

const App = {
    init() {
        this.refresh();
    },

    async refresh() {
        await API.getAllData();
        TransactionService.setAllTransactions();
        DOM.setBalance();
    }
}

App.init();