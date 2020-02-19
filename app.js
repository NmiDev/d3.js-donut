const app = {
    // Properties
    form: document.getElementById('form'),
    clearInput: document.getElementById('clear'),
    nameInput: document.getElementById('name'),
    costInput: document.getElementById('cost'),
    monitor: document.getElementById('monitor'),

    // Init
    init: function() {
        console.log("app loaded");
        app.form.addEventListener('submit', app.submitForm);
        app.clearInput.addEventListener('click', app.clearForm);
    },

    // Methods
    submitForm: function(evt) {
        evt.preventDefault();

        const name = app.nameInput.value;
        const cost = app.costInput.value;

        if (app.isCostValid(cost) && app.isNameValid(name)) {
            // Clean the monitor
            app.monitor.style.display = 'none';
            // Add the item to db
            app.addExpense(name, cost)
                .then(function(docRef) {
                    app.displayMessage(`Document written with ID: ${docRef.id}`, true);
                })
                .catch(function(error) {
                    app.displayMessage(`Error adding document: ${error}`, false);
                });
        } else {
            app.displayMessage('Invalid inputs', false);  
        }
        
        
    },

    clearForm: function() {
        app.message = '';
        app.monitor.style.display = 'none';
        app.form.reset();
    },

    displayMessage: function(message, isInfo) {
        app.monitor.style.color = isInfo ? 'green' : 'red';
        app.monitor.textContent = message;
        app.monitor.style.display = "block";
    },

    isCostValid: function(value) {
        if (value < 1 || value > 1000 ) {
            return false;
        }
        return true;
    },

    isNameValid: function(value) {
        if (value.length < 3 || value.length > 50) {
            return false;
        }
        return true;
    },

    // CRUD operations
    addExpense: function(name, cost) {
        return db.collection("expenses").add({
            name: name,
            cost: Number(cost)
        });
    }
}

document.addEventListener('DOMContentLoaded', app.init);