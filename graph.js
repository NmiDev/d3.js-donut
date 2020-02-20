// Dimensions and center
const dims = {
    chartHeight: 300,
    chartWidth: 300, 
    chartRadius: 150,
    legendWidth: 150,
    legendHeight: 150
}

const center = {
    x: dims.chartWidth/2 + 5,
    y: dims.chartHeight/2 + 5
}

// Containers settings
const svg = d3.select('.canvas')
    .append('svg')
    .attr('width', dims.chartWidth + dims.legendWidth)
    .attr('height', dims.chartHeight + dims.legendHeight);

const graph = svg
    .append('g')
    .attr('transform', `translate(${center.x}, ${center.y})`);

// Angle generator
const pie = d3.pie()
    .sort(null)
    .value(d => d.cost);

// Path arc generator
const arcPath = d3.arc()
    .outerRadius(dims.chartRadius)
    .innerRadius(dims.chartRadius/2);

// Ordinal scale initialisation
const colour = d3.scaleOrdinal(d3['schemeSet1']);

// Tween
function arcTweenEnter(d) {
    const i = d3.interpolate(d.endAngle, d.startAngle);

    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
}

function arcTweenExit(d) {
    const i = d3.interpolate(d.startAngle, d.endAngle);

    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
}

function arcTweenUpdate(d) {
    // Interpolate the two objects (all keys/value by default)
    const i = d3.interpolate(this._current, d);
    // Update the current prop with the updated data for next cycle
    this._current = d;

    return function(t) {
        return arcPath(i(t));
    }
}

// Legend setup
const legendGroup = svg.append('g')
    .attr('transform', `translate(${dims.chartWidth + 40}, 20)`);

const legend = d3.legendColor()
    .shape('circle')
    .shapePadding('10')
    .scale(colour)

// Event listener
function handleMouseOver(d, i, n) {
    d3.select(n[i])
        .transition('changeSliceFill')
        .duration(300)
        .attr('fill', 'white');
}

function handleMouseOut(d, i, n) {
    d3.select(n[i])
        .transition('changeSliceFill')
        .duration(300)
        .attr('fill', colour([d.data.name]) )
}

function handleMouseClick(d, i, n) {
    db.collection('expenses').doc(d.data.id).delete().then(function() {
        console.log("Document successfully deleted!");
    }).catch(function(error) {
        console.error("Error removing document: ", error);
    });
}

// Tooltip setup
const tip = d3.tip()
    .attr('class', 'tip')
    .html(d => {
        let html = ``;
        html += `<div class="tip-name">${d.data.name}</div>`;
        html += `<div class="tip-cost">${d.data.cost}</div>`;
        return html;
    })

graph.call(tip);

// Update function
const update = (data) => {
    // Scale update with data
    colour.domain(data.map(item => item.name))
    // Legend update
    legendGroup.call(legend)
    // Angles data
    const angles = pie(data);
    // Join data to path element
    const paths = graph.selectAll('path').data(angles);

    // Remove unnecessary shapes using the exit selection
    paths
        .exit()
        .transition()
        .duration(750)
            .attrTween('d', arcTweenExit)
        .remove();

    // Update current shapes in the DOM
    paths
        .attr('d', arcPath)
        .transition()
        .duration(750)
            .attrTween('d', arcTweenUpdate);

    // Append the enter selection ti the DOM
    paths
        .enter()
        .append('path')
            .attr('class', 'arc')
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .attr('fill', d => colour(d.data.name))
            .each(function(d) {
                this._current = d;
            })
            .transition()
            .duration(750)
                .attrTween('d', arcTweenEnter);
    
    // Event listener
    graph.selectAll('.arc').on('mouseover', (d,i,n) => {
        tip.show(d, n[i])
        handleMouseOver(d,i,n);
    });
    graph.selectAll('.arc').on('mouseout', (d,i,n) => {
        tip.hide();
        handleMouseOut(d,i,n);
    });
    graph.selectAll('.arc').on('click', handleMouseClick)
}

// Fetch and listening DB changes
const data = [];

db.collection('expenses').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(change => {
        const doc = {...change.doc.data(), id: change.doc.id};
        
        switch (change.type) {
            case 'added':
                data.push(doc);
                break;
            
            case 'modified':
                data.forEach((element, index) => {
                    if (element.id === doc.id) {
                        data[index] = doc;
                    }
                })
                break;

            case 'removed':
                data.forEach((element, index) => {
                    if (element.id === doc.id) {
                        data.splice(index, 1);
                    }
                })
                break;

            default:
                break;
        }
    });
    update(data);
});

