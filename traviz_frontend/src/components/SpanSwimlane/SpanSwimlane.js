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

function getMaxDur(spans) {
    let maxDur = 0;
    spans.forEach(span => {
        let dur = span.end - span.start;
        if (dur > maxDur) {
            maxDur = dur
        }
    });
    return maxDur
}

function getMinDur(spans) {
    let minDur = Infinity;
    spans.forEach(span => {
        let dur = span.end - span.start;
        if (dur < minDur) {
            minDur = dur
        }
    });
    return minDur
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

function mapThreadsIdsToLane(spans) {
    let threadToLaneMap = new Map()
    spans.forEach(span => {
        threadToLaneMap.set(span.id, span.y_id)
    });
    return threadToLaneMap
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

class SpanSwimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
        this.state = { trace: [], tasks: null };
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
        let lanes = createLanes(this.state.trace);
        let spans = createSpans(this.state.trace);
        let connectingLines = getConnectingLines(events);

        // Create an event map and span map to get event and span faster,
        // but still need the array to pass it to d3.
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
        let duration = end - start;

        // Create map that contains the proper thread ids on each lane
        let threadToLaneMap = mapThreadsIdsToLane(spans);

        var margin = { top: 20, right: 15, bottom: 15, left: 15 }
            , width = 1900 - margin.left - margin.right
            , height = 900 - margin.top - margin.bottom
            , miniHeight = lanes.length * 12 + 50
            , mainHeight = height - miniHeight - 50;

        var x_padding = 0.1 * duration;
        var x = d3v3.scale.linear().domain([start - x_padding, end + x_padding]).range([0, width]);
        var x1 = d3v3.scale.linear().domain([start - x_padding, end + x_padding]).range([0, width]);

        var ext = d3v3.extent(lanes, function (d) { return d.id; });
        var y1 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, mainHeight]);
        var y2 = d3v3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

        var chart = d3v3.select('body')
            .append('svg:svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .attr('class', 'chart');

        // chart.append('defs').append('clipPath')
        //     .attr('id', 'clip')
        //     .append('rect')
        //     .attr('width', width)
        //     .attr('height', mainHeight);

        // var main = chart.append('g')
        //     .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        //     .attr('width', width)
        //     .attr('height', mainHeight)
        //     .attr('class', 'main');

        var mini = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + 60 + ')')
            .attr('width', width)
            .attr('height', miniHeight)
            .attr('class', 'mini');

        // draw the lanes for the main chart
        // main.append('g').selectAll('.laneLines')
        //     .data(lanes)
        //     .enter().append('line')
        //     .attr('x1', 0)
        //     .attr('y1', function (d) { return d3v3.round(y1(d.id)) + 0.5; })
        //     .attr('x2', width)
        //     .attr('y2', function (d) { return d3v3.round(y1(d.id)) + 0.5; })
        //     .attr('stroke', function (d) { return d.label === '' ? 'white' : 'white' });

        // main.append('g').selectAll('.laneText')
        //     .data(lanes)
        //     .enter().append('text')
        //     .text(function (d) { return d.label; })
        //     .attr('x', -10)
        //     .attr('y', function (d) { return y1(d.id + .5); })
        //     .attr('dy', '0.5ex')
        //     .attr('text-anchor', 'end')
        //     .attr('fill', 'white')
        //     .style('font-weight', 'bold')
        //     .attr('class', 'laneText');


        // draw the lanes for the mini chart
        mini.append('g').selectAll('.laneLines')
            .data(lanes)
            .enter().append('line')
            .attr('x1', 0)
            .attr('y1', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
            .attr('x2', width)
            .attr('y2', function (d) { return d3v3.round(y2(d.id)) + 0.5; })
            .attr('stroke', function (d) { return d.label === '' ? 'white' : 'white' });

        mini.append('g').selectAll('.laneText')
            .data(lanes)
            .enter().append('text')
            .text(function (d) { return d.label; })
            .attr('x', -10)
            .attr('y', function (d) { return y2(d.id + .5); })
            .attr('dy', '0.5ex')
            .attr('text-anchor', 'end')
            .style('font-weight', 'bold')
            .attr('fill', "white")
            .attr('class', 'laneText');

        // draw the x axis
        var xAxis = d3v3.svg.axis()
            .scale(x)
            .orient('bottom')
            // .ticks(d3v3.time.mondays, (x.domain()[1] - x.domain()[0]) > 15552e6 ? 2 : 1)
            .ticks(5)
            .tickFormat((d) => {
                let scaledVals = x(d)
                return d3v3.round(scaledVals)
            })
            .tickSize(6, 0, 0);

        var x1Axis = d3v3.svg.axis()
            .scale(x1)
            .orient('bottom')
            .ticks(5)
            .tickFormat((d) => {
                let scaledVals = x1(d)
                return d3v3.round(scaledVals)
            })
            .tickSize(6, 0, 0)

        // main.append('g')
        //     .attr('transform', 'translate(0,' + mainHeight + ')')
        //     .attr('class', 'main axis')
        //     .attr('fill', 'white')
        //     .call(x1Axis);

        mini.append('g')
            .attr('transform', 'translate(0,' + miniHeight + ')')
            .attr('class', 'axis')
            .attr('fill', 'white')
            .call(xAxis);

        // draw the spans
        // var itemRects = main.append('g')
        //     .attr('clip-path', 'url(#clip)');

        mini.append('g').selectAll('miniItems')
            .data(getPaths(spans))
            .enter().append('path')
            .attr('class', function (d) { return 'miniItem ' + d.class; })
            .attr('d', function (d) { return d.path; });

        // Create node for event circles
        // let circles = main.append("g")

        // Create node for event lines
        // let lines = main.append("svg")
        //     .attr("stroke-width", 2)
        //     .attr("stroke", "#ffd800")

        // invisible hit area to move around the selection window
        // mini.append('rect')
        //     .attr('pointer-events', 'painted')
        //     .attr('width', width)
        //     .attr('height', miniHeight)
        //     .attr('visibility', 'hidden')
        //     .on('mouseup', moveBrush);

        // Draw the selection area
        // var brush = d3v3.svg.brush()
        //     .x(x)
        //     .extent([start, end])
        //     .on("brush", display);

        // mini.append('g')
        //     .attr('class', 'x brush')
        //     .call(brush)
        //     .selectAll('rect')
        //     .attr('y', 1)
        //     .attr('height', miniHeight - 1);

        mini.selectAll('rect.background').remove();

        // Define the div for the tooltip
        var tooltipdiv = d3v3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.createHistogram(spans)
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

        // function moveBrush() {
        //     var origin = d3v3.mouse(this)
        //         , point = x.invert(origin[0])
        //         , halfExtent = (brush.extent()[1] - brush.extent()[0]) / 2
        //         , start = point - halfExtent
        //         , end = point + halfExtent;

        //     brush.extent([start, end]);
        //     display();
        // }
    }


    createHistograms(tasks, margin, width, height) {
        // Define size of one histogram
        let histMargin = { top: 5, right: 5, bottom: 5, left: 5 }
        let histWidth = 20
        let histHeight = 30

        let minDur = 0
        let maxDur = 100

        tasks.forEach(task => {

            let histSvg = d3v3.select('body')
                .append("svg")
                .attr("width", histWidth + histMargin.left + histMargin.right)
                .attr("height", histHeight + histMargin.top + histMargin.bottom)
                .append("g")
                .attr('class', "histogram")
                .attr("transform",
                    "translate(" + histMargin.left + "," + histMargin.top + ")")

            let histX = d3v3.scale.linear()
                .domain([minDur, maxDur])
                .range([0, histWidth]);

            let data = d3v3.layout.histogram()
                .bins(histX.ticks(20))
                (task.data.map(s => { return Math.round((s.end - s.start) / 1000000) }));

            let color = "#b1de00";
            let histYMax = d3v3.max(data, function (d) { return d.length });
            let histYMin = d3v3.min(data, function (d) { return d.length });
            let colorScale = d3v3.scale.linear()
                .domain([histYMin, histYMax])
                .range([d3v3.rgb(color).brighter(), d3v3.rgb(color).darker()]);

            let histY = d3v3.scale.linear()
                .domain([0, histYMax])
                .range([histHeight, 0]);

            let histXAxis = d3v3.svg.axis()
                .scale(histX)
                .orient("bottom")

            let bar = histSvg.selectAll(".bar")
                .data(data)
                .enter().append("g")
                .attr("class", "bar")
                .attr("transform", function (d) { return "translate(" + histX(d.x) + "," + histY(d.y) + ")"; });

            bar.append("rect")
                .attr("x", 1)
                .attr("width", (histX(data[0].dx) - histX(0)) - 1)
                .attr("height", function (d) { return histHeight - histY(d.y); })
                .attr("fill", function (d) { return colorScale(d.y) });

            bar.append("text")
                .attr("dy", ".75em")
                .attr("y", -12)
                .attr("x", (histX(data[0].dx) - histX(0)) / 2)
                .attr("text-anchor", "middle")
                .attr("class", "histText")
                .text(function (d) { return d.y; })
                .style("fill", "#bebebe");

            histSvg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + histHeight + ")")
                .call(histXAxis)
                .style("fill", "#bebebe");

            histSvg.append("text")
                .attr("transform", "translate(" + (histWidth / 2) + " ," + (histHeight + histMargin.bottom) + ")")
                .style("fill", "#bebebe")
                .style("text-anchor", "middle")
                .text("Duration");
        })

    }

    // createHistogram(spans, histMargin, histWidth, histHeight) {
    //     // Define histogram boundaries
    //     let histMargin = { top: 20, right: 30, bottom: 30, left: 30 };
    //     let histWidth = 960 - histMargin.left - histMargin.right;
    //     let histHeight = 500 - histMargin.top - histMargin.bottom;

    //     let maxDur = Math.round(getMaxDur(spans)) / 1000000;
    //     let minDur = Math.round(getMinDur(spans)) / 1000000;
    //     let histX = d3v3.scale.linear()
    //         .domain([minDur, maxDur])
    //         .range([0, histWidth]);






    // }

    render() {
        return <div>
            <div id={"#" + this.props.id}></div>
        </div>

    }
}

export default SpanSwimlane