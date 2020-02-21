const app = {
    // Form properties
    form: document.getElementById('form'),
    clearInput: document.getElementById('clear'),
    nameInput: document.getElementById('name'),
    costInput: document.getElementById('cost'),
    monitor: document.getElementById('monitor'),
    // Graph properties
    data: [],
    dims: null,
    center: null,
    svg: null,
    graph: null,
    pie: null,
    arcPath: null,
    color: null,
    legendGroup: null,
    legend: null,
    tip: null,

    // App init
    init: function() {
        // Form event handler
        app.form.addEventListener('submit', app.submitForm);
        app.clearInput.addEventListener('click', app.clearForm);
        // Init graph configuration
        app.initGraphConfig();
        // Init Firebase listener
        db.collection('expenses').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach(change => {
                // Catch the doc
                const doc = {...change.doc.data(), id: change.doc.id};
                // Catch the change type
                const changeType = change.type;
                // Refresh local data
                app.refreshData(doc, changeType);
            });
            app.update(app.data);
        });

    },

    // Methods: form and monitor
    submitForm: function(evt) {
        evt.preventDefault();

        const name = app.nameInput.value.trim();
        const cost = app.costInput.value.trim();

        if (app.isCostValid(cost) && app.isNameValid(name)) {
            // Clean the monitor
            app.monitor.style.display = 'none';
            // Add the item to db
            app.addExpense(name, cost)
                .then(docRef => {
                    app.displayMessage(`Document written with ID: ${docRef.id}`, 'success');
                })
                .catch(error => {
                    app.displayMessage(`Error adding document: ${error}`, 'error');
                });
            // Clear the form
            setTimeout(app.clearForm, 2000);
        } else {
            app.displayMessage('Invalid inputs', 'error');  
        }
        
        
    },

    clearForm: function() {
        app.message = '';
        app.monitor.style.display = 'none';
        app.form.reset();
    },

    displayMessage: function(message, type) {
        app.monitor.style.color = (type === 'success') ? 'green' : 'red';
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

    // Methods: graph
    initGraphConfig: function () {
        // Dimensions and center
        app.dims = {
            chartHeight: 300,
            chartWidth: 300, 
            chartRadius: 150,
            legendWidth: 150,
            legendHeight: 150
        }

        app.center = {
            x: app.dims.chartWidth/2 + 5,
            y: app.dims.chartHeight/2 + 5
        }

        // Containers settings
        app.svg = d3.select('.canvas')
            .append('svg')
            .attr('width', app.dims.chartWidth + app.dims.legendWidth)
            .attr('height', app.dims.chartHeight + app.dims.legendHeight);

        app.graph = app.svg
            .append('g')
            .attr('transform', `translate(${app.center.x}, ${app.center.y})`);

        // Angle generator
        app.pie = d3.pie()
            .sort(null)
            .value(d => d.cost);

        // Path arc generator
        app.arcPath = d3.arc()
            .outerRadius(app.dims.chartRadius)
            .innerRadius(app.dims.chartRadius/2);

        // Ordinal scale initialisation
        app.color = d3.scaleOrdinal(d3['schemeSet1']);

        // Legend setup
        app.legendGroup = app.svg.append('g')
            .attr('transform', `translate(${app.dims.chartWidth + 40}, 20)`);

        app.legend = d3.legendColor()
            .shape('circle')
            .shapePadding('10')
            .scale(app.color);

        // Tooltip setup
        app.tip = d3.tip()
            .attr('class', 'tip')
            .html(d => {
                let html = ``;
                html += `<div class="tip-name">${d.data.name}</div>`;
                html += `<div class="tip-cost">${d.data.cost}</div>`;
                return html;
            })

        app.graph.call(app.tip);
    },

    arcTweenEnter: function(d) {
        const i = d3.interpolate(d.endAngle, d.startAngle);
    
        return function(t){
            d.startAngle = i(t);
            return app.arcPath(d);
        }
    },

    arcTweenExit: function (d) {
        const i = d3.interpolate(d.startAngle, d.endAngle);
    
        return function(t){
            d.startAngle = i(t);
            return app.arcPath(d);
        }
    },

    arcTweenUpdate: function(d) {
        // Interpolate the two objects (all keys/value by default)
        const i = d3.interpolate(this._current, d);
        // Update the current prop with the updated data for next cycle
        this._current = d;
    
        return function(t) {
            return app.arcPath(i(t));
        }
    },

    handleMouseOver: function(d, i, n) {
        d3.select(n[i])
            .transition('changeSliceFill')
            .duration(300)
            .attr('fill', 'white');
    },

    handleMouseOut: function(d, i, n) {
        d3.select(n[i])
            .transition('changeSliceFill')
            .duration(300)
            .attr('fill', app.color([d.data.name]) )
    },

    handleMouseClick: function(d, i, n) {
        const docId = d.data.id;

        app.deleteExpense(docId)
            .then(() => {
                app.displayMessage('Document successfully deleted!', 'success');
            })
            .catch(error => {
                app.displayMessage(`Error removing document: ${error}`, 'error');
        });
    },

    update: function(data) {
        // Scale update with data
        app.color.domain(data.map(item => item.name))
        // Legend update
        app.legendGroup.call(app.legend)
        // Angles data
        const angles = app.pie(data);
        // Join data to path element
        const paths = app.graph.selectAll('path').data(angles);

        // Remove unnecessary shapes using the exit selection
        paths
            .exit()
            .transition()
            .duration(750)
                .attrTween('d', app.arcTweenExit)
            .remove();

        // Update current shapes in the DOM
        paths
            .attr('d', app.arcPath)
            .transition()
            .duration(750)
                .attrTween('d', app.arcTweenUpdate);

        // Append the enter selection ti the DOM
        paths
            .enter()
            .append('path')
                .attr('class', 'arc')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', d => app.color(d.data.name))
                .each(function(d) {
                    this._current = d;
                })
                .transition()
                .duration(750)
                    .attrTween('d', app.arcTweenEnter);
        
        // Event listener
        app.graph.selectAll('.arc').on('mouseover', (d,i,n) => {
            app.tip.show(d, n[i])
            app.handleMouseOver(d,i,n);
        });
        app.graph.selectAll('.arc').on('mouseout', (d,i,n) => {
            app.tip.hide();
            app.handleMouseOut(d,i,n);
        });
        app.graph.selectAll('.arc').on('click', app.handleMouseClick);
    },

    // CRUD operations
    refreshData: function(doc, changeType) {
        switch (changeType) {
            case 'added':
                app.data.push(doc);
                break;
            
            case 'modified':
                app.data.forEach((element, index) => {
                    if (element.id === doc.id) {
                        data[index] = doc;
                    }
                })
                break;

            case 'removed':
                app.data.forEach((element, index) => {
                    if (element.id === doc.id) {
                        app.data.splice(index, 1);
                    }
                })
                break;

            default:
                break;
        }
    },

    addExpense: function(name, cost) {
        return db.collection("expenses").add({
            name: name,
            cost: Number(cost)
        });
    },

    deleteExpense: function(id) {
        return db.collection('expenses').doc(id).delete();
    }
}

document.addEventListener('DOMContentLoaded', app.init);