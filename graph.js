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

// Update function
const update = (data) => {
    // Angles data
    const angles = pie(data);
    // Join data to path element
    const paths = graph.selectAll('path').data(angles);

    // Remove unnecessary shapes using the exit selection
    paths
        .exit()
        .remove();

    // Update current shapes in the DOM
    paths
        .attr('d', arcPath);

    // Append the enter selection ti the DOM
    paths
        .enter()
        .append('path')
            .attr('class', 'arc')
            .attr('d', arcPath)
            .attr('stroke', 'white')
            .attr('stroke-width', 3);

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


// Path arc generator
const arcPath = d3.arc()
    .outerRadius(dims.chartRadius)
    .innerRadius(dims.chartRadius/2);

