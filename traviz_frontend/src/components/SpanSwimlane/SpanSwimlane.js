import React, { Component } from "react"
import * as d3v3 from "d3-v3"
import * as dc from "dc"
import * as crossfilter from "crossfilter2/crossfilter";
import './SpanSwimlane.css'
import TraceService from "../../services/TraceService/TraceService";
import TaskService from "../../services/TaskService/TaskService";

// TODO: Find best way to partition bins in x-axis
//         - Static 20 bins at the moment. Make it dynamic to input.

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

function createSpans(events) {
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

// For each span, find and set the direct children of that span.
function setChildSpans(spanMap, eventMap) {
    spanMap.forEach(span => {
        if (span.parentEventID !== null && span.parentEventID !== undefined) {
            span.parentEventID.forEach(parentEventId => {
                let parentEvent = eventMap.get(parentEventId);
                let parentSpanId = parentEvent.ThreadID;
                let parentSpan = spanMap.get(parentSpanId);
                if (parentSpan.childSpanId == null || parentSpan.childSpanId == undefined) {
                    let childSpanId = new Array()
                    childSpanId.push(span.id);
                    parentSpan.childSpanId = childSpanId
                } else {
                    parentSpan.childSpanId.push(span.id);
                }
            });
        }
    });
}

// Mark the spans that are in the critical path.
function markCriticalPath(spanMap, currentSpanId, parentSpanClass) {
    if (currentSpanId === null || currentSpanId === undefined) {
        return;
    }
    let currentSpan = spanMap.get(currentSpanId);

    if (currentSpan.childSpanId !== null && currentSpan.childSpanId !== undefined) {
        for (let i = 0; i < currentSpan.childSpanId.length; i++) {
            let childSpanId = currentSpan.childSpanId[i];
            let childSpan = spanMap.get(childSpanId);
            let inCriticalPath = true;
            for (let j = 0; j < currentSpan.childSpanId.length; j++) {
                let comparisonSpanId = currentSpan.childSpanId[j];
                let comparisonSpan = spanMap.get(comparisonSpanId);
                if (childSpan.start > comparisonSpan.start && childSpan.end < comparisonSpan.end) {
                    inCriticalPath = false;
                    break
                }
            }
            if (inCriticalPath && parentSpanClass === "criticalPath") {
                childSpan.class = "criticalPath";
            }
            markCriticalPath(spanMap, childSpanId, childSpan.class);
        }
    }
}

// function threadIdToIdMap(spans) {
//     let map = new Map()
//     for (let i = 0; i < spans.length; i++) {
//         let span = spans[i]
//         map.set(i, span)
//     }
//     spans.forEach(s => {
//         map.set()
//     })
// }

class SpanSwimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
        this.state = { trace: [], tasks: null, selectedTask: null };
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
        let events = this.state.trace;
        let tasks = this.state.tasks;
        let lanes = createLanes(this.state.trace);
        let spans = createSpans(this.state.trace);
        let spanMap = makeSpanMap(spans);
        let eventMap = makeEventMap(events);

        // Mark first span as in critical path
        if (spans.length > 0) {
            spans[0].class = "criticalPath"
        }

        // Find the child span of each span and then use that to
        // find the critical path of a trace.
        setChildSpans(spanMap, eventMap);
        markCriticalPath(spanMap, spans[0].id, "criticalPath");

        // Get start, end and duration
        let start = getStartTime(this.state.trace);
        let end = getEndTime(this.state.trace);

        // Create map that contains the proper thread ids on each lane

        var margin = { top: 20, right: 10, bottom: 100, left: 10 }
            , width = 1870 - margin.left - margin.right
            , miniHeight = lanes.length * 20 + 50

        var x = d3v3.scale.linear().domain([start, end]).range([0, width]);

        var ext = d3v3.extent(lanes, function (d) { return d.id; });
        var y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

        var chart = d3v3.select('#swimlane')
            .append('svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', miniHeight + margin.top + margin.bottom)
            .attr('class', 'chart');

        var mini = chart.append('g')
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

        mini.append('g').selectAll('miniItems')
            .data(getPaths(spans))
            .enter().append('path')
            .attr('class', function (d) { return 'miniItem ' + d.class; })
            .attr('d', function (d) { return d.path; });

        mini.selectAll('rect.background').remove();

        // Define the div for the tooltip
        var tooltipdiv = d3v3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.createHistograms(tasks)
        display();

        function display() {

            var rects, labels
            // , minExtent = brush.extent()[0]
            // , maxExtent = brush.extent()[1]
            // , visItems = spans.filter(function (d) { return d.start < maxExtent && d.end > minExtent })
            // , visEvents = events.filter(function (d) { return d.HRT <= maxExtent && d.HRT >= minExtent })
            // , visLines = connectingLines.filter(function (d) {
            //     return (d.origin.HRT <= maxExtent && d.origin.HRT >= minExtent) ||
            //         (d.destination.HRT <= maxExtent && d.destination.HRT >= minExtent)
            // });

            // mini.select('.brush').call(brush.extent([minExtent, maxExtent]));

            // x1.domain([minExtent, maxExtent]);

            // update the axis
            // main.select('.main.axis').call(x1Axis);

            // upate the item rects
            // rects = itemRects.selectAll('rect')
            //     .data(visItems, function (d) { return d.id; })
            //     .attr('x', function (d) { return x1(d.start); })
            //     .attr('width', function (d) { return x1(d.end) - x1(d.start); })
            //     .attr('stroke', 'red')

            // rects.enter().append('rect')
            //     .attr('x', function (d) { return x1(d.start); })
            //     .attr('y', function (d) { return y1(d.y_id) + .1 * y1(1) + 0.5; })
            //     .attr('width', function (d) { return x1(d.end) - x1(d.start); })
            //     .attr('height', function (d) { return .8 * y1(1); })
            //     .attr('class', function (d) { return 'mainItem ' + d.class; })
            //     .attr('stroke', 'red')

            // rects.exit().remove();

            // draw the event circles
            // let circs = circles.selectAll(".circ")
            //     .data(visEvents)
            //     .attr("r", 0.1 * y1(1))
            //     .attr("fill", "white")
            //     .attr("stroke", "black")
            //     .attr("cx", function (d) { return x1(d.HRT) })
            //     .attr("cy", function (d) { return y1(threadToLaneMap.get(d.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("class", "circ")

            // circs.enter().append("circle")
            //     .attr("r", 0.1 * y1(1))
            //     .attr("fill", "white")
            //     .attr("stroke", "black")
            //     .attr("cx", function (d) { return x1(d.HRT) })
            //     .attr("cy", function (d) { return y1(threadToLaneMap.get(d.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("class", "circ")
            //     .on("mouseover", function (d) {
            //         tooltipdiv.transition()
            //             .duration(200)
            //             .style("opacity", .9);
            //         tooltipdiv.html("Event id: " + d.EventID + "<br/>" + "Timestamp: " + d.Timestamp + "<br/>" + "Label: " + d.Label)
            //             .style("left", (d3v3.event.pageX) + "px")
            //             .style("top", (d3v3.event.pageY - 28) + "px")
            //     })
            //     .on("mouseout", function (d) {
            //         tooltipdiv.transition()
            //             .duration(500)
            //             .style("opacity", 0);
            //     })

            // circs.exit().remove();

            // draw the lines between parent and child events
            // let lins = lines.selectAll(".lin")
            //     .data(visLines)
            //     .attr("width", 200)
            //     .attr("x1", function (d) { return x1(d.origin.HRT) })
            //     .attr("y1", function (d) { return y1(threadToLaneMap.get(d.origin.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("x2", function (d) { return x1(d.destination.HRT) })
            //     .attr("y2", function (d) { return y1(threadToLaneMap.get(d.destination.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("class", "lin");

            // lins.enter().append("line")
            //     .attr("width", 200)
            //     .attr("x1", function (d) { return x1(d.origin.HRT) })
            //     .attr("y1", function (d) { return y1(threadToLaneMap.get(d.origin.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("x2", function (d) { return x1(d.destination.HRT) })
            //     .attr("y2", function (d) { return y1(threadToLaneMap.get(d.destination.ThreadID)) + .5 * y1(1) + 0.5; })
            //     .attr("class", "lin");

            // lins.exit().remove();

            d3v3.select("#cont").attr("align", "center")
        }

        function getPaths(items) {
            var paths = {}
            var d
            var offset = .5 * y2(1) + 0.5
            var result = [];
            for (var i = 0; i < items.length; i++) {
                d = items[i];
                if (!paths[d.class]) paths[d.class] = '';
                paths[d.class] += ['M', x(d.start), (y2(d.y_id) + offset), 'H', x(d.end)].join(' ');
            }

            for (var className in paths) {
                result.push({ class: className, path: paths[className] });
            }
            return result;
        }
    }

    createHistograms(tasks) {
        // Define size of one histogram
        let histMargin = { top: 20, right: 20, bottom: 15, left: 5 }
        let histWidth = 100
        let histHeight = 100

        tasks.forEach(task => {
            let logData = task.Data.filter(d => d != 0).map(d => Math.log(d))
            logData = task.Data

            let minDur = Math.min.apply(Math, logData)
            let maxDur = Math.max.apply(Math, logData)

            console.log(task)
            let histSvg = d3v3.select('#hists')
                .append("svg")
                .attr("width", histWidth + histMargin.left + histMargin.right)
                .attr("height", histHeight + histMargin.top + histMargin.bottom)
                .append("g")
                .attr('class', "s")
                .attr("transform",
                    "translate(" + histMargin.left + "," + histMargin.top + ")")
                .on("mouseover", function() {
                    console.log("mouseover")
                    d3v3.select("s")
                    .attr("fill", "red");
                })
                .on("mouseout", function() {
                    console.log("mouseout")
                })

            let histX = d3v3.scale.linear()
                .domain([minDur, maxDur])
                .range([0, histWidth]);

            let data = d3v3.layout.histogram()
                .bins(histX.ticks(15))(logData);

            let histYMax = d3v3.max(data, function (d) { return d.length });
            let histYMin = d3v3.min(data, function (d) { return d.length });

            let histY = d3v3.scale.linear()
                .domain([0, histYMax])
                .range([histHeight, 0]);

            let bar = histSvg.selectAll(".bar")
                .data(data)
                .enter().append("g")
                .attr("class", "bar")
                .attr("transform", function (d) { return "translate(" + histX(d.x) + "," + histY(d.y) + ")"; });

            bar.append("rect")
                .attr("x", 1)
                .attr("width", (histX(data[0].dx) - histX(0)) - 1)
                .attr("height", function (d) { return histHeight - histY(d.y); })
                .attr("fill", function (d) {
                    let min = Math.min.apply(Math, d);
                    let max = Math.max.apply(Math, d);
                    let logDur = Math.log(task.Duration);
                    logDur = task.Duration
                    if (logDur !== null && logDur >= min && logDur <= max) {
                        return "#fff600" // Red
                    } else {
                        return "#8EB200" // Green
                    }
                });
        })

    }

    render() {
        return <div id="container" >
            <div id="swimlane"> </div>
            <div id="hists"></div>
        </div>

    }
}

export default SpanSwimlane