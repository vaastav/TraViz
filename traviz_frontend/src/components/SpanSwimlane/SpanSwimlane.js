import React, { Component } from "react"
import * as d3v3 from "d3-v3"
import './SpanSwimlane.css'
import { range } from 'lodash';
import TraceService from "../../services/TraceService/TraceService";
import TaskService from "../../services/TaskService/TaskService";
import { stratify } from "d3";

// TODO: Find best way to partition bins in x-axis
//         - Static 20 bins at the moment. Make it dynamic to input.

//set the colour options up here
var spanColorString
var highlightSpanColorString
var molehillColorString
var molehillThresholdColorString
var histogramPlainColorString
var eventsLowProbColorString
var eventsHighProbColorString
var textColorString
var linkColorString
var laneColorString

function initialiseColours() {
    laneColorString = getComputedStyle(document.documentElement).getPropertyValue('--lane-color');
    spanColorString = getComputedStyle(document.documentElement).getPropertyValue('--span-color');
    highlightSpanColorString = getComputedStyle(document.documentElement).getPropertyValue('--highlight-span-color');
    molehillColorString = getComputedStyle(document.documentElement).getPropertyValue('--molehill-color');
    molehillThresholdColorString = getComputedStyle(document.documentElement).getPropertyValue('--molehill-threshold-color');
    histogramPlainColorString = getComputedStyle(document.documentElement).getPropertyValue('--histogram-plain-color');
    eventsLowProbColorString = getComputedStyle(document.documentElement).getPropertyValue('--events-low-prob-color').trim();
    eventsHighProbColorString = getComputedStyle(document.documentElement).getPropertyValue('--events-high-prob-color').trim();
    textColorString = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    linkColorString = getComputedStyle(document.documentElement).getPropertyValue('--link-color');

}

function linspace(start, end, num_bins) {
    let diff = end - start;
    let interval = diff / num_bins;
    let a = new Array(num_bins);
    let val = start;
    for (let i = 0; i <= num_bins; i++) {
        a[i] = val;
        val += interval;
    }
    a[num_bins] = end
    return a;
}

function createLanes(events) {
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

function filterZerosFromHistData(data) {
    let filteredData = new Array()
    data.forEach(a => {
        if (a.length !== 0) {
            filteredData.push(a)
        }
    })
    return filteredData
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

function addMolehills(spans, tasks) {
    let superMaxCount = 0;
    for (var i = 0; i < spans.length; i++) {

        let molehills = new Array();
        let durationMS = Math.round((spans[i].end - spans[i].start) / 1000000);

        for (var j = 0; j < durationMS; j++) {
            //Making sure value varies by no more than 10% each time
            var procCount = 0;

            for (var k = 0; k < tasks[i].MolehillData.length; k++) {
                let curr = tasks[i].MolehillData[k];
                if (curr.Start <= j * 1000000) {
                    if (curr.End >= j * 1000000) {
                        procCount++
                    }
                }

            }

            if (procCount > superMaxCount) {
                superMaxCount = procCount
            }
            let molehill = {
                id: j,
                val: procCount
            }
            molehills.push(molehill);
        }

        spans[i].molehills = molehills;

    }

    spans.forEach(s => {
        s.molehills.forEach(m => {
            m.val = Math.round((m.val / superMaxCount) * 100);
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
    let laneMap = new Map(); let numberOfBins = new Array(15).fill(0)
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

function getConnectingLines(events) {
    let mapOfEvents = new Map()
    events.forEach(event => {
        mapOfEvents.set(event.EventID, event)
    })

    let connectingLines = new Array()
    events.forEach(event => {
        if (event.ParentEventID !== null) {
            event.ParentEventID.forEach(pid => {
                let parentEvent = mapOfEvents.get(pid)
                if (event.ThreadID != parentEvent.ThreadID) {
                    let line = { origin: parentEvent, destination: event }
                    connectingLines.push(line)
                }
            })

        }
    })
    return connectingLines
}


function mapThreadsIdsToLane(spans) {
    let threadToLaneMap = new Map()
    spans.forEach(span => {
        threadToLaneMap.set(span.id, span.y_id)
    });
    return threadToLaneMap
}

function getEventMap(events) {
    let map = new Map();
    events.forEach(event => {
        map.set(event.EventID, event);
    });
    return map;
}

class SpanSwimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
        this.state = { trace: [], tasks: null, selectedTask: null, molehillsOn: false, molehillThreshold: 95, eventsOn: false, legendOn: false, structureOn: false, relationships: null };
        this.traceService = new TraceService();
        this.taskService = new TaskService();
    }

    componentDidMount() {
        const id = this.props.id;
        this.traceService.getTrace(id).then(trace => {
            this.state.trace = trace
            this.taskService.getTasks(id).then(tasks => {
                this.state.tasks = tasks;
                this.taskService.getRelationships(id).then(relationships => {
                    this.state.relationships = relationships;
                    this.createSwimlane();
                })

            })
        });

    }

    componentDidUpdate() {
        this.createSwimlane();
    }

    createSwimlane() {
        initialiseColours()

        // Define events, lanes, spans and connecting lines
        let events = this.state.trace.sort((a, b) => { return a.Timestamp - b.Timestamp })
        let eventMap = getEventMap(events)
        let spans = createSpans(this.state.trace);
        let tasks = sortTasks(this.state.tasks, spans);
        let edges = this.state.relationships
        edges.shift()
        this.state.tasks = tasks;
        spans = addMolehills(spans, tasks);

        let lanes = createLanes(this.state.trace);
        let laneMap = makeLaneMap(lanes);

        // Get start, end and duration
        let start = getStartTime(this.state.trace);
        let end = getEndTime(this.state.trace);

        // Create map that contains the proper thread ids on each lane
        var margin = { top: 20, right: 10, bottom: 100, left: this.state.legendOn ? 175 : 10 }
            , width = 1870 - margin.left - margin.right

        // Gives size of swimlane with mini lanes. 20 is the height of each lane
        var laneHeight = 20.0;
        var spanHeight = 8;
        var molehillShift = (laneHeight - 2) / 2 - spanHeight;
        var maxMolehillHeight = laneHeight - spanHeight - 5;

        var miniHeight = lanes.length * laneHeight;

        var x = d3v3.scale.linear().domain([start, end]).range([0, width]);

        var ext = d3v3.extent(lanes, function (d) { return d.id; });
        var y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);
        var molehillY = d3v3.scale.linear().domain([0, 100]).range([0, maxMolehillHeight]);
        var molehillsOn = this.state.molehillsOn;
        var legendOn = this.state.legendOn;
        var eventsOn = this.state.eventsOn;
        var structureOn = this.state.structureOn;
        var molehillThreshold = this.state.molehillThreshold;

        var chart;
        var mini;

        initialiseChart()

        let spanRectangles

        drawSpans();

        createToolbar();

        mini.selectAll('rect.background').remove();

        // Define the div for the tooltip
        var tooltipdiv = d3v3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        drawHistograms();
        if (this.state.legendOn) {
            createLegend(); //This legend suckssss
        }

        //DRAWING FUNCTIONS (next 6)
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
                histSvg.selectAll("rect.bars")
                    .data([task]).enter().append("rect")
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

                        redrawHighlightedSpan()
                    })

                // Create actual histogram
                let histX = d3v3.scale.linear()
                    .domain([minDur, maxDur])
                    .range([histMargin.left, histWidth - histMargin.right]);

                let bins = linspace(minDur, maxDur, 12);
                let data = d3v3.layout.histogram()
                    .bins(bins)(task.Data);

                data = filterZerosFromHistData(data)

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

        function drawEdges() {
            mini.selectAll('.lin').remove();
            if (structureOn) {
                let eventSize = spanHeight - 2;

                let lines = mini.append("svg")
                    .attr("stroke-width", 2)
                    .attr("stroke", linkColorString)

                // draw the lines between parent and child events
                let lins = lines.selectAll(".lin")
                    .data(edges)


                lins.enter().append("line")
                    .attr("stroke-width", function (d) {
                        if (d.Percentage < 0.5) {
                            return 1;
                        } else if (d.Percentage >= 0.5 && d.Percentage < 0.60) {
                            return 2;
                        } else if (d.Percentage >= 0.6 && d.Percentage < 0.72) {
                            return 3;
                        } else if (d.Percentage >= 0.72 && d.Percentage < 0.85) {
                            return 4;
                        } else {
                            return 5;
                        }
                    })
                    .attr("x1", function (d) {
                        let srcId = d.Src_ID.split("-")[0]
                        return x(eventMap.get(srcId).HRT)
                    })
                    .attr("y1", function (d) {
                        let srcId = d.Src_ID.split("-")[0]
                        let threadId = eventMap.get(srcId).ThreadID
                        return y2(laneMap.get(threadId).id) + ((laneHeight / 2) + (spanHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)));
                    })
                    .attr("x2", function (d) {
                        let dstId = d.Dst_ID.split("-")[0]
                        return x(eventMap.get(dstId).HRT)
                    })
                    .attr("y2", function (d) {
                        let dstId = d.Dst_ID.split("-")[0]
                        let threadId = eventMap.get(dstId).ThreadID
                        return y2(laneMap.get(threadId).id) + ((laneHeight / 2) + (spanHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)));
                    })
                    .attr("class", "lin");

                lins.exit().remove();

            }
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


            // mini.append('g').selectAll('.laneRects')
            //     .data(lanes)
            //     .enter().append('rect')
            //     .attr('x', 0)
            //     .attr('y', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
            //     .attr('width', width)
            //     .attr('height', laneHeight)
            //     .attr('stroke-width', 0)
            //     .attr('fill', molehillThresholdColorString);

            // draw the lanes for the mini chart
            mini.append('g').selectAll('.laneLines')
                .data(lanes)
                .enter().append('line')
                .attr('x1', 0)
                .attr('y1', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
                .attr('x2', width)
                .attr('y2', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
                .attr('stroke', laneColorString);

            // Draw the last lane so we have a box
            let lastLane = lanes[lanes.length - 1]
            mini.append('g').selectAll('.laneLines')
                .data(lanes)
                .enter().append('line')
                .attr('x1', 0)
                .attr('y1', d3v3.round(y2(lastLane.id + 1)) + 0.5)
                .attr('x2', width)
                .attr('y2', d3v3.round(y2(lastLane.id + 1)) + 0.5)
                .attr('stroke', laneColorString);
        }

        function redrawHighlightedSpan() {
            let rectanglesToRedraw = mini.selectAll('.gSpans')
                .selectAll('rect')
                .filter((d) => {
                    return d.class === "selected" || d.class === "prevselected"
                })

            let dataToRedraw = rectanglesToRedraw.data()
            rectanglesToRedraw.remove()

            mini.selectAll('.bgroundHighlight').remove()

            spanRectangles
                .data(dataToRedraw)
                .attr('x', (d) => { return x(d.start) })
                .attr('y', (d) => { return y2(lanes.find(l => l.ThreadID === d.id).id) + (laneHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)) })
                .attr('width', (d) => { return x(d.end) - x(d.start) })
                .attr('class', (d) => { return d.class });

            spanRectangles.enter().append('rect')
                .data(dataToRedraw)
                .attr('class', (d) => { return (d.class + "bgroundHighlight bgroundHighlight") })
                .attr('x', 0)
                .attr('y', (d) => { return y2(lanes.find(l => l.ThreadID === d.id).id) + 1 })
                .attr('width', width)
                .attr('height', laneHeight - 1)


            spanRectangles.enter().append('rect')
                .attr('x', (d) => { return x(d.start) })
                .attr('y', (d) => { return y2(lanes.find(l => l.ThreadID === d.id).id) + (laneHeight / 2) - (molehillsOn ? -(molehillShift) : (spanHeight / 2)) })
                .attr('width', (d) => { return x(d.end) - x(d.start) })
                .attr('height', spanHeight)
                .attr('class', (d) => { return d.class })
                .attr('stroke', spanColorString)
                .attr('fill', spanColorString)
                .on('mouseover', (e) => {
                    d3v3.selectAll("rect.bars")
                        .style("opacity", 0)

                    d3v3.selectAll("rect.bars").filter((d) => d.ThreadID === e.id)
                        .style("opacity", 0.1)

                    setSelectedSpan(spans, e.id, tasks)
                    redrawHighlightedSpan()
                })

            if (molehillsOn) {
                drawMolehills();
            }

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
                    d3v3.selectAll("rect.bars")
                        .style("opacity", 0)

                    d3v3.selectAll("rect.bars").filter((d) => d.ThreadID === e.id)
                        .style("opacity", 0.1)

                    setSelectedSpan(spans, e.id, tasks)
                    redrawHighlightedSpan()
                })

            drawEvents()
            drawEdges()
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
                    .attr('y', (d) => { return (y2(lanes.find(l => l.ThreadID === spans[i].id).id) + (laneHeight / 2) + (molehillShift - 1)) - molehillY(d.val) })
                    .attr('width', mhWidth)
                    .attr('height', (d) => molehillY(d.val))
                    .attr('stroke', (d) => (d.val > molehillThreshold ? molehillThresholdColorString : molehillColorString))
                    .attr('fill', (d) => (d.val > molehillThreshold ? molehillThresholdColorString : molehillColorString));
            }
        }

        function drawEvents() {
            mini.selectAll('.gEvents').remove();

            if (eventsOn) {

                let eventSize = spanHeight - 2;

                let colourScheme = d3v3.scale.linear()
                    .domain([0, 1])
                    .interpolate(d3v3.interpolateHcl)
                    .range([d3v3.rgb(eventsLowProbColorString), d3v3.rgb(eventsHighProbColorString)])

                let eventRectangles = mini.append('g').attr('class', 'gEvents').selectAll('rect')
                    .data(events)
                    .attr('x', 0)
                    .attr('y', 0)

                eventRectangles.enter().append("rect")
                    .attr("fill", d => colourScheme(d.Probability))
                    .attr("stroke", d => {
                        return colourScheme(d.Probability)
                    })
                    .attr('width', 1)
                    .attr('height', eventSize)
                    .attr("x", function (d) { return x(d.HRT) })
                    .attr("y", function (d) { return y2(laneMap.get(d.ThreadID).id) + ((laneHeight / 2) + (spanHeight - eventSize) / 2 - (molehillsOn ? -(molehillShift) : (spanHeight / 2))); })

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
                    .style("fill", textColorString)
                    .text(function (d) { return d })
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")

                if (eventsOn) {
                    leg.append("text")
                        .attr("x", 75)
                        .attr("y", startPoint + (keys.length * box) + (height * 2))
                        .style("fill", "white")
                        .text("Events")
                        .attr("text-anchor", "middle")
                        .style("alignment-baseline", "middle")

                    let colourScheme = d3v3.scale.linear()
                        .domain([0, 1])
                        .interpolate(d3v3.interpolateHcl)
                        .range([d3v3.rgb(eventsLowProbColorString), d3v3.rgb(eventsHighProbColorString)])

                    let miniRecWidth = 150 / probabilityRange.length

                    leg.selectAll("colourScale")
                        .data(probabilityRange)
                        .enter()
                        .append("rect")
                        .attr("x", (d, i) => 5 + i * miniRecWidth)
                        .attr("y", startPoint + ((keys.length + 1) * box) + (height / 2))
                        .attr("width", miniRecWidth)
                        .attr("height", height * 2)
                        .style("fill", d => colourScheme(d))

                    leg.append("text")
                        .attr("x", 5)
                        .attr("y", startPoint + ((keys.length + 1) * box) + (6 * height))
                        .text("low prob")
                        .style("fill", textColorString)
                        .style("font-size", "10px")

                    leg.append("text")
                        .attr("x", 110)
                        .attr("y", startPoint + ((keys.length + 1) * box) + (6 * height))
                        .text("high prob")
                        .style("fill", textColorString)
                        .style("font-size", "10px")

                }
            }
        }

        function createToolbar() {
            d3v3.select("#toolbar").append('input')
                .attr('type', 'checkbox')
                .attr('id', 'molehillCheckbox')

                .on("click", function () {
                    molehillsOn = !molehillsOn;
                    if (molehillsOn) {

                        var s = document.createElement('label')
                        s.id = "thresholdLabel"
                        var text = document.createTextNode(' Highlight Threshold: ' + molehillThreshold)
                        s.appendChild(text)

                        this.parentNode.insertBefore(s, this.nextSibling.nextSibling)

                        //add slider
                        var t = document.createElement('input')
                        t.type = 'range'
                        t.min = '0'
                        t.max = '100'
                        t.value = molehillThreshold
                        t.class = "slider"
                        t.id = "thresholdRange"
                        t.onchange = function () {
                            molehillThreshold = this.value
                            if (molehillsOn) {
                                drawMolehills()
                            }
                        }
                        t.oninput = function () {
                            d3v3.select("#thresholdLabel").text(' Highlight Threshold: ' + this.value)
                        }


                        this.parentNode.insertBefore(t, this.nextSibling.nextSibling.nextSibling)



                        drawMolehills()
                        drawSpans()



                        createLegend()

                    } else {
                        d3v3.select("#thresholdRange").remove()
                        d3v3.select("#thresholdLabel").remove()
                        //this removes the <g> containing all the molehill rectangles
                        mini.selectAll('.gMolehillRectangles').remove()

                        //need to redraw the spans to put them back in the middle of the lane
                        drawSpans()

                        createLegend()

                    }
                });

            d3v3.select("#toolbar")
                .append('label').attr('for', 'molehillCheckbox')
                .text('Molehills');

            d3v3.select("#toolbar").append('input')
                .attr('type', 'checkbox')
                .attr('id', 'eventsCheckbox')

                .on("click", function () {
                    eventsOn = !eventsOn;
                    mini.selectAll('.gEvents').remove();
                    if (eventsOn) {



                        if (molehillsOn) {
                            drawMolehills()
                        }

                        drawSpans()

                        createLegend()

                    } else {
                        //this removes the <g> containing all the event markers


                        //this removes the <g> containing all the molehill rectangles
                        mini.selectAll('.gMolehillRectangles').remove()


                        //need to redraw the spans to put them back in the middle of the lane


                        if (molehillsOn) {
                            drawMolehills()
                        }

                        drawSpans()

                        createLegend()

                    }
                });

            d3v3.select("#toolbar")
                .append('label').attr('for', 'eventsCheckbox')
                .text('Events');

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


                        if (molehillsOn) {

                            drawMolehills()
                        }

                        drawSpans()
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




                        if (molehillsOn) {
                            drawMolehills()

                        }

                        drawSpans()


                    }
                });


            d3v3.select("#toolbar")
                .append('label').attr('for', 'legendCheckbox')
                .text('Legend')


            d3v3.select("#toolbar").append('input')
                .attr('type', 'checkbox')
                .attr('id', 'eventsCheckbox')
                .on("click", function () {
                    structureOn = !structureOn;
                    mini.selectAll('.lin').remove();
                    if (structureOn) {




                        if (molehillsOn) {
                            drawMolehills()
                        }

                        drawSpans()

                        createLegend()

                    } else {
                        //this removes the <g> containing all the event markers


                        //this removes the <g> containing all the molehill rectangles
                        mini.selectAll('.lin').remove()


                        //need to redraw the spans to put them back in the middle of the lane


                        if (molehillsOn) {
                            drawMolehills()
                        }

                        drawSpans()
                        createLegend()

                    }
                });


            d3v3.select('#toolbar')
                .append('label').attr('for', 'structureCheckbox')
                .text('Structure')

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
