import React, { Component } from "react"
import * as d3v3 from "d3-v3"
import './SpanSwimlane.css'
import { range } from 'lodash';
import TraceService from "../../services/TraceService/TraceService";
import TaskService from "../../services/TaskService/TaskService";

// TODO: Find best way to partition bins in x-axis
//         - Static 20 bins at the moment. Make it dynamic to input.

var molehillThreshold = 99; //set a threshold to highlight values above (set to 100 if not wanted)

//set the colour options up here
var spanColorString
var highlightSpanColorString
var molehillColorString
var molehillThresholdColorString
var histogramPlainColorString

function initialiseColours() {
    spanColorString = getComputedStyle(document.documentElement).getPropertyValue('--span-color');
    highlightSpanColorString = getComputedStyle(document.documentElement).getPropertyValue('--highlight-span-color');
    molehillColorString = getComputedStyle(document.documentElement).getPropertyValue('--molehill-color');
    molehillThresholdColorString = getComputedStyle(document.documentElement).getPropertyValue('--molehill-threshold-color');
    histogramPlainColorString = getComputedStyle(document.documentElement).getPropertyValue('--histogram-plain-color');
}

function createLanes(events) {
    initialiseColours()
    let lanes = []
    let count = 0
    events.forEach(event => {
        if (lanes.find((l) => l.ThreadID === event.ThreadID) === undefined) {
            lanes.push({ id: count, ThreadID: event.ThreadID, label: "thread " + event.ThreadID })
            count++
        }
    });
    return lanes
}

function getStartTime(events) {
    let earliestStart = null
    events.forEach(event => {
        if (earliestStart === null) {
            earliestStart = event.HRT
        } else {
            if (earliestStart > event.HRT) {
                earliestStart = event.HRT
            }
        }
    })
    return earliestStart
}

function getEndTime(events) {
    let lastEnd = null
    events.forEach(event => {
        if (lastEnd === null) {
            lastEnd = event.HRT
        } else {
            if (lastEnd < event.HRT) {
                lastEnd = event.HRT
            }
        }
    })
    return lastEnd
}

function createSpans(events) {
    //if we are going to try add molehills into the frontend then this is personally where I would add it - as an array on the span and then should be able to edit the drawing method too
    let spans = new Array();
    let count = 0
    events.forEach(event => {
        if (spans.find((s) => s.id === event.ThreadID) !== undefined) {
            let i = spans.findIndex((s) => s.id === event.ThreadID);
            let span = spans[i];
            span.start = span.start > event.HRT ? event.HRT : span.start;
            span.end = span.end < event.HRT ? event.HRT : span.end;
            span.events.push(event);
            spans[i] = span;
        } else {
            let newEventArray = new Array();
            newEventArray.push(event)
            let newSpan = {
                id: event.ThreadID,
                start: event.HRT,
                end: event.HRT,
                events: newEventArray,
                class: "normal",
                y_id: count,
                parentEventID: event.ParentEventID
            };
            spans.push(newSpan);
            count++
        }
    });

    
    
    return spans
}

function addMolehills(spans,tasks){
    let superMaxCount = 0;
    for(var i = 0; i<spans.length; i++){
        
        let molehills = new Array();
        let durationMS = Math.round((spans[i].end - spans[i].start) / 1000000);

        for (var j = 0; j < durationMS; j++) {
            //Making sure value varies by no more than 10% each time
            var procCount = 0;
            
            for(var k = 0; k<tasks[i].MolehillData.length; k++){
                let curr = tasks[i].MolehillData[k];
                if(curr.Start<=j*1000000){
                    if(curr.End>=j*1000000){
                        procCount++
                    }
                }
                
            }

            if(procCount>superMaxCount){
                superMaxCount = procCount
            }
            let molehill = {
                id: j,
                val: procCount
            }
            molehills.push(molehill);
        }
        
        spans[i].molehills=molehills;
        
    }

    spans.forEach(s => {
        s.molehills.forEach(m => {
            m.val = Math.round((m.val/superMaxCount)*100);
        })
    })

    return spans;

}

function makeEventMap(events) {
    let eventMap = new Map();
    events.forEach(event => {
        eventMap.set(event.EventID, event);
    })
    return eventMap;
}

function makeSpanMap(spans) {
    let spanMap = new Map();
    spans.forEach(span => {
        spanMap.set(span.id, span);
    })
    return spanMap;
}

function makeLaneMap(lanes) {
    let laneMap = new Map();
    lanes.forEach(lane => {
        laneMap.set(lane.ThreadID, lane);
    })
    return laneMap;
}

// For each span, find and set the direct children of that span.
function setChildSpans(spanMap, eventMap) {
    spanMap.forEach(span => {
        if (span.parentEventID !== null && span.parentEventID !== undefined) {
            span.parentEventID.forEach(parentEventId => {
                let parentEvent = eventMap.get(parentEventId);
                if (parentEvent !== undefined) {
                    let parentSpanId = parentEvent.ThreadID;
                    let parentSpan = spanMap.get(parentSpanId);
                    if (parentSpan.childSpanId == null || parentSpan.childSpanId == undefined) {
                        let childSpanId = new Array()
                        childSpanId.push(span.id);
                        parentSpan.childSpanId = childSpanId
                    } else {
                        parentSpan.childSpanId.push(span.id);
                    }
                }
            });
        }
    });
}

function setSelectedSpan(spans, threadId, tasks) {
    var prevprevThreadID = 0;
    var prevThreadID = 0;
    spans.forEach(span => {
        if (span.class == "prevselected") {
            prevprevThreadID = span.id;
            span.class = "normal"
        }
        if (span.class == "selected") {
            prevThreadID = span.id;
            span.class = "prevselected"
        }
    })
    spans.forEach(span => {
        if (span.id === threadId) {
            span.class = "selected"
        }
    })
    tasks.forEach(task => {
        if (task.ThreadID === threadId) {
            task.bar.attr("fill", function (d) {
                let min = Math.min.apply(Math, d);
                let max = Math.max.apply(Math, d);
                if (task.Duration !== null && task.Duration >= min && task.Duration <= max) {
                    return highlightSpanColorString
                } else {
                    return histogramPlainColorString
                }
            })
        } else {
            task.bar.attr("fill", function (d) {
                let min = Math.min.apply(Math, d);
                let max = Math.max.apply(Math, d);
                if (task.Duration !== null && task.Duration >= min && task.Duration <= max) {
                    return spanColorString
                } else {
                    return histogramPlainColorString
                }
            })
        }
    })
}

function sortTasks(tasks, spans) {
    let sortedTasks = new Array(tasks.length);
    for (let i = 0; i < tasks.length; i++) {
        let task = tasks[i];
        for (let j = 0; j < spans.length; j++) {
            let span = spans[j];
            if (task.ThreadID === span.id) {
                sortedTasks[j] = task;
            }
        }
        task.bar = null;
    }
    return sortedTasks;
}

class SpanSwimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
        this.state = { trace: [], tasks: null, selectedTask: null, molehillsOn: false, eventsOn: false, legendOn: false };
        this.traceService = new TraceService();
        this.taskService = new TaskService();
    }

    componentDidMount() {
        const id = this.props.id;
        this.traceService.getTrace(id).then(trace => {
            this.state.trace = trace
            this.taskService.getTasks(id).then(tasks => {
                this.state.tasks = tasks;
                this.createSwimlane();
            })
        });
    }

    componentDidUpdate() {
        this.createSwimlane();
    }

    createSwimlane() {

        // Define events, lanes, spand and connecting lines
        let events = this.state.trace.sort((a, b) => { return a.Timestamp - b.Timestamp })
        let spans = createSpans(this.state.trace);
        let tasks = sortTasks(this.state.tasks, spans);
        this.state.tasks = tasks;
        spans = addMolehills(spans,tasks);

        let lanes = createLanes(this.state.trace);
        let laneMap = makeLaneMap(lanes);
        let spanMap = makeSpanMap(spans);
        let eventMap = makeEventMap(events);

        // Get start, end and duration
        let start = getStartTime(this.state.trace);
        let end = getEndTime(this.state.trace);

        // Create map that contains the proper thread ids on each lane
        var margin = { top: 20, right: 10, bottom: 100, left: this.state.legendOn ? 175 : 10 }
            , width = 1870 - margin.left - margin.right

        // Gives size of swimlane with mini lanes. 20 is the height of each lane
        var laneHeight = 20.0;
        var spanHeight = 8;
        var molehillShift = (laneHeight-2)/2 - spanHeight;
        var maxMolehillHeight = laneHeight-spanHeight-5;

        var miniHeight = lanes.length * laneHeight;

        var x = d3v3.scale.linear().domain([start, end]).range([0, width]);

        var ext = d3v3.extent(lanes, function (d) { return d.id; });
        var y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);
        var molehillY = d3v3.scale.linear().domain([0, 100]).range([0, maxMolehillHeight]);
        var molehillsOn = this.state.molehillsOn;
        var legendOn = this.state.legendOn;
        var eventsOn = this.state.eventsOn;

        var chart;
        var mini;

        initialiseChart()

        let spanRectangles
        let circles = mini.append("g")

        drawSpans();

        // Add Toolbar
        d3v3.select("#toolbar").append('input')
            .attr('type', 'checkbox')
            .attr('id', 'molehillCheckbox')

            .on("click", function () {
                molehillsOn = !molehillsOn;
                if (molehillsOn) {
                  
                    drawSpans()

                    drawMolehills()

                    createLegend()

                } else {
                    //this removes the <g> containing all the molehill rectangles
                    mini.selectAll('.gMolehillRectangles').remove()
                    
                    //need to redraw the spans to put them back in the middle of the lane
                    drawSpans()

                    createLegend()

                }
            });

        d3v3.select("#toolbar")
            .append('label').attr('for', 'molehillCheckbox')
            .text('Molehills On');

        d3v3.select("#toolbar").append('input')
            .attr('type', 'checkbox')
            .attr('id', 'eventsCheckbox')

            .on("click", function () {
                eventsOn = !eventsOn;
                mini.selectAll('.gEvents').remove();
                if (eventsOn) {
                    
                    drawSpans()

                    if (molehillsOn) {
                        drawMolehills()
                    }

                    createLegend()

                } else {
                    //this removes the <g> containing all the event markers
                    

                    //this removes the <g> containing all the molehill rectangles
                    mini.selectAll('.gMolehillRectangles').remove()
                    

                    //need to redraw the spans to put them back in the middle of the lane
                    drawSpans()

                    if (molehillsOn) {
                        drawMolehills()
                    }

                    createLegend()

                }
            });

        d3v3.select("#toolbar")
            .append('label').attr('for', 'eventsCheckbox')
            .text('Events On');

        d3v3.select("#toolbar").append('input')
            .attr('type', 'checkbox')
            .attr('id', 'legendCheckbox')

            .on("click", function () {
                legendOn = !legendOn;
                if (legendOn) {
                    margin = { top: 20, right: 10, bottom: 100, left: 175 }
                    width = 1870 - margin.left - margin.right

                    x = d3v3.scale.linear().domain([start, end]).range([0, width]);

                    ext = d3v3.extent(lanes, function (d) { return d.id; });
                    y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

                    chart.remove()

                    initialiseChart()

                    drawSpans()
                    if (molehillsOn) {

                        drawMolehills()
                    }


                    createLegend()
                } else {


                    margin = { top: 20, right: 10, bottom: 100, left: 10 }
                    width = 1870 - margin.left - margin.right

                    x = d3v3.scale.linear().domain([start, end]).range([0, width]);
                    ext = d3v3.extent(lanes, function (d) { return d.id; });
                    y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

                    // Gives size of swimlane with mini lanes. 20 is the height of each lane

                    chart.remove()

                    initialiseChart()

                    drawSpans()


                    if (molehillsOn) {
                        drawMolehills()

                    }


                }
            });


        d3v3.select("#toolbar")
            .append('label').attr('for', 'legendCheckbox')
            .text('Legend On')

        mini.selectAll('rect.background').remove();

        // Define the div for the tooltip
        var tooltipdiv = d3v3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        drawHistograms();
        if (this.state.legendOn) {
            createLegend(); //This legend suckssss
        }

        //DRAWING FUNCTIONS (next 5)
        function drawHistograms() {
            // Define size of one histogram
            let histMargin = { top: 10, right: 10, bottom: 10, left: 10 }
            let histWidth = 100
            let histHeight = 100

            tasks.forEach(task => {

                let minDur = Math.min.apply(Math, task.Data)
                let maxDur = Math.max.apply(Math, task.Data)

                // Create svg element for each histrogram
                let histSvg = d3v3.select('#hists')
                    .append("svg")
                    .attr("width", histWidth + histMargin.left + histMargin.right)
                    .attr("height", histHeight + histMargin.top + histMargin.bottom)
                    .append("g")
                    .attr("transform",
                        "translate(" + histMargin.left + "," + histMargin.top + ")")

                // Append highlight rectangle to each histogram svg
                histSvg.append("rect")
                    .attr("width", histWidth + histMargin.left + histMargin.right)
                    .attr("height", histHeight + histMargin.top + histMargin.bottom)
                    .attr("class", "bars")
                    .style("opacity", 0)
                    .style("fill", "white")
                    .on("mouseover", function () {
                        d3v3.selectAll("rect.bars")
                            .style("opacity", 0)

                        d3v3.select(this)
                            .style("opacity", 0.1)

                        setSelectedSpan(spans, task.ThreadID, tasks)

                        drawSpans()
                    })


                // Create actual histogram
                let histX = d3v3.scale.linear()
                    .domain([minDur, maxDur])
                    .range([histMargin.left, histWidth - histMargin.right]);

                let data = d3v3.layout.histogram()
                    .bins(histX.ticks(15))(task.Data);

                let histYMax = d3v3.max(data, function (d) { return d.length });

                let histY = d3v3.scale.log()
                    .domain([0.0001, histYMax])
                    .range([histHeight, histMargin.bottom])
                    .base(2);

                let bar = histSvg.selectAll(".bar")
                    .data(data)
                    .enter().append("g")
                    .attr("class", "bar")
                    .attr("transform", function (d) { return "translate(" + histX(d.x) + "," + histY(d.y) + ")"; })
                    .style("align", "center")

                let rect = bar.append("rect")
                    .attr("class", "align-bars")
                    .attr("width", (histX(data[0].dx) - histX(0)) - 1)
                    .attr("height", function (d) { return histHeight - histY(d.y); })
                    .attr("fill", function (d) {
                        let min = Math.min.apply(Math, d);
                        let max = Math.max.apply(Math, d);
                        if (task.Duration !== null && task.Duration >= min && task.Duration <= max) {
                            return spanColorString 
                        } else {
                            return histogramPlainColorString
                        }
                    })
                    .style("align", "center")
                task.bar = rect
            })
        }

        function initialiseChart() {

            chart = d3v3.select('#swimlane')
                .append('svg')
                .attr('width', width + margin.right + margin.left)
                .attr('height', miniHeight + margin.top + margin.bottom)
                .attr('class', 'chart');

            mini = chart.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + 60 + ')')
                .attr('width', width)
                .attr('height', miniHeight)
                .attr('class', 'mini');

            // draw the lanes for the mini chart
            mini.append('g').selectAll('.laneLines')
                .data(lanes)
                .enter().append('line')
                .attr('x1', 0)
                .attr('y1', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
                .attr('x2', width)
                .attr('y2', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
                .attr('stroke', "#979797");

            // Draw the last lane so we have a box
            let lastLane = lanes[lanes.length - 1]
            mini.append('g').selectAll('.laneLines')
                .data(lanes)
                .enter().append('line')
                .attr('x1', 0)
                .attr('y1', d3v3.round(y2(lastLane.id + 1)) + 0.5)
                .attr('x2', width)
                .attr('y2', d3v3.round(y2(lastLane.id + 1)) + 0.5)
                .attr('stroke', "#979797");
        }

        function drawSpans() {
            mini.selectAll('.gSpans').remove();

            spanRectangles = mini.append('g').attr('class', 'gSpans').selectAll('rect')
                .data(spans)
                .attr('x', (d) => { return x(d.start) })
                .attr('y', (d) => { return y2(lanes.find(l => l.ThreadID === d.id).id) + (laneHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)) })
                .attr('width', (d) => { return x(d.end) - x(d.start) })
                .attr('class', (d) => { return d.class })

            spanRectangles.enter().append('rect')
                .attr('x', (d) => { return x(d.start) })
                .attr('y', (d) => { return y2(lanes.find(l => l.ThreadID === d.id).id) + (laneHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)) })
                .attr('width', (d) => { return x(d.end) - x(d.start) })
                .attr('height', spanHeight)
                .attr('class', (d) => { return d.class })
                .attr('stroke', spanColorString)
                .attr('fill', spanColorString)
                .on('mouseover', (e) => {
                    setSelectedSpan(spans,e.id,tasks)
                    drawSpans()
                })

            drawCircles()
        }
        

        function drawMolehills() {
            for (var i = 0; i < spans.length; i++) {
                var mhWidth = (x(spans[i].end) - x(spans[i].start)) / spans[i].molehills.length;
                var spanStartPoint = x(spans[i].start);
                let molehillRectangles = mini.append('g').attr('class', 'gMolehillRectangles').selectAll('rect')
                    .data(spans[i].molehills)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 10)

                molehillRectangles.enter().append('rect')
                    .attr("class", 'molehillRect')
                    .attr('x', (d) => {
                        return spanStartPoint + d.id * mhWidth;
                    })
                    .attr('y', (d) => { return (y2(lanes.find(l => l.ThreadID === spans[i].id).id) + (laneHeight / 2) + (molehillShift-1)) - molehillY(d.val) })
                    .attr('width', mhWidth)
                    .attr('height', (d) => molehillY(d.val))
                    .attr('stroke', (d) => (d.val > molehillThreshold ? molehillThresholdColorString : molehillColorString))
                    .attr('fill', (d) => (d.val > molehillThreshold ? molehillThresholdColorString : molehillColorString));
            }
        }

        function drawCircles() {
            mini.selectAll('.gEvents').remove();
            
            if (eventsOn) {
                if (circles !== undefined) {
                    circles.remove()
                }

                let eventSize = spanHeight/2;

                let colourScheme = d3v3.scale.linear()
                    .domain([0, 1])
                    .interpolate(d3v3.interpolateHcl)
                    .range([d3v3.rgb("white"), d3v3.rgb("black")])

                
                let eventRectangles = mini.append('g').attr('class', 'gEvents').selectAll('rect')
                    .data(events)
                    .attr('x', 0)
                    .attr('y', 0)

                    eventRectangles.enter().append("rect")
                    .attr("fill", d => colourScheme(d.Probability))
                    .attr("stroke", d => {
                        return colourScheme(d.Probability)
                    })
                    .attr('width',1)
                    .attr('height',spanHeight)
                    .attr("x", function (d) { return x(d.HRT) })
                    .attr("y", function (d) { return y2(laneMap.get(d.ThreadID).id) + ((laneHeight / 2) - (molehillsOn ? -( molehillShift ) : (spanHeight / 2))); })

                eventRectangles.exit().remove();
            }
        }

        function createLegend() {

            if (legendOn) {

                chart.selectAll('.legend').remove()
                chart.selectAll('.scaleSvg').remove()
                // create a list of keys
                var keys = ["Span", "Selected Span"]
                var probabilityRange = range(0, 1, 0.01)
                var color = [spanColorString, highlightSpanColorString]

                if (molehillsOn) {
                    keys.push("Contention")
                    keys.push("Above Threshold")
                    color.push(molehillColorString)
                    color.push(molehillThresholdColorString)
                }

                // keys.push("Hist Scale: log₂")

                // Add one dot in the legend for each name.
                var box = 20
                var width = 10
                var height = 5
                var startPoint = ((miniHeight + margin.top + margin.bottom) / 2) - (keys.length / 2 * (box + 5))
                var leg = chart.append('g').attr('class', 'legend')

                leg.selectAll("mydots")
                    .data(keys)
                    .enter()
                    .append("rect")
                    .attr("x", 5)
                    .attr("y", function (d, i) { return startPoint + i * (box) }) // 100 is where the first dot appears. 25 is the distance between dots
                    .attr("width", function (d, i) { return keys[i].includes("Span") ? width : height })
                    .attr("height", function (d, i) { return keys[i].includes("Span") ? height : width })
                    .style("fill", function (d, i) { return color[i] })

                // Add one dot in the legend for each name.
                leg.selectAll("mylabels")
                    .data(keys)
                    .enter()
                    .append("text")
                    .attr("x", function (d, i) { return keys[i].includes("Scale") ? 5 : 20 })
                    .attr("y", function (d, i) { return (startPoint + (i * box) + (keys[i].includes("Span") ? height / 2 : width / 2 + 1)) }) // 100 is where the first dot appears. 25 is the distance between dots
                    .style("fill", "white")
                    .text(function (d) { return d })
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")

                let colourScheme = d3v3.scale.linear()
                    .domain([0, 1])
                    .interpolate(d3v3.interpolateHcl)
                    .range([d3v3.rgb("white"), d3v3.rgb("black")])

                let miniRecWidth = 150 / probabilityRange.length
                leg.selectAll("colourScale")
                    .data(probabilityRange)
                    .enter()
                    .append("rect")
                    .attr("x", (d, i) => 5 + i * miniRecWidth)
                    .attr("y", startPoint + (keys.length * box) + (height / 2))
                    .attr("width", miniRecWidth)
                    .attr("height", height * 2)
                    .style("fill", d => colourScheme(d))

                leg.append("text")
                    .attr("x", 5)
                    .attr("y", startPoint + (keys.length * box) + (6 * height))
                    .text("low prob")
                    .style("fill", "white")
                    .style("font-size", "10px")

                leg.append("text")
                    .attr("x", 110)
                    .attr("y", startPoint + (keys.length * box) + (6 * height))
                    .text("high prob")
                    .style("fill", "white")
                    .style("font-size", "10px")

            }
        }


    }

    render() {
        return <div id="container" >
            <div id="toolbar"></div>
            <div id="swimlane"> </div>
            <div id="hists"></div>
        </div>

    }
}

export default SpanSwimlane
