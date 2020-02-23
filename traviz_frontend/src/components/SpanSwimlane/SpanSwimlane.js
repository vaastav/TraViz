import React, { Component } from "react"
import * as d3v3 from "d3-v3"
import './SpanSwimlane.css'
import TraceService from "../../services/TraceService/TraceService";

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
                y_id: count
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

function markCriticalPath(spans) {
    for (let i = 1; i < spans.length; i++) {
        let span = spans[i];
        let inCriticalPath = true;
        for (let j = 1; j < spans.length; j++) {
            let comparisonSpan = spans[j];
            if (span.start > comparisonSpan.start && span.end < comparisonSpan.end) {
                inCriticalPath = false;
                break;
            }
        }
        if (inCriticalPath) {
            span.class = "criticalPath"
        }
    }
}

function getCriticalPath(spans) {
    let criticalPath = spans.slice()
    for (let i = 1; i < spans.length; i++) {
        let span = spans[i];
        for (let j = 1; j < spans.length; j++) {
            let comparisonSpan = spans[j];
            if (span.start > comparisonSpan.start && span.end < comparisonSpan.end) {
                criticalPath.splice(i, 1);
                break;
            }
        }
    }
    return criticalPath;
}

class SpanSwimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
        this.state = { trace: [] };
        this.traceService = new TraceService();
    }

    componentDidMount() {
        const id = this.props.id;
        this.traceService.getTrace(id).then(trace => {
            this.state.trace = trace
            this.createSwimlane();
        });
    }

    componentDidUpdate() {
        this.createSwimlane();
    }

    createSwimlane() {
        let events = this.state.trace;
        let lanes = createLanes(this.state.trace);
        let spans = createSpans(this.state.trace);
        let connectingLines = getConnectingLines(events);
        markCriticalPath(spans);

        let start = getStartTime(this.state.trace);
        let end = getEndTime(this.state.trace);
        let duration = end - start;
        let threadToLaneMap = mapThreadsIdsToLane(spans);

        var margin = { top: 20, right: 15, bottom: 15, left: 150 }
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

        chart.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', width)
            .attr('height', mainHeight);

        var main = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr('width', width)
            .attr('height', mainHeight)
            .attr('class', 'main');

        var mini = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + (mainHeight + 60) + ')')
            .attr('width', width)
            .attr('height', miniHeight)
            .attr('class', 'mini');

        // draw the lanes for the main chart
        main.append('g').selectAll('.laneLines')
            .data(lanes)
            .enter().append('line')
            .attr('x1', 0)
            .attr('y1', function (d) { return d3v3.round(y1(d.id)) + 0.5; })
            .attr('x2', width)
            .attr('y2', function (d) { return d3v3.round(y1(d.id)) + 0.5; })
            .attr('stroke', function (d) { return d.label === '' ? 'white' : 'white' });

        main.append('g').selectAll('.laneText')
            .data(lanes)
            .enter().append('text')
            .text(function (d) { return d.label; })
            .attr('x', -10)
            .attr('y', function (d) { return y1(d.id + .5); })
            .attr('dy', '0.5ex')
            .attr('text-anchor', 'end')
            .attr('fill', 'white')
            .style('font-weight', 'bold')
            .attr('class', 'laneText');

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

        main.append('g')
            .attr('transform', 'translate(0,' + mainHeight + ')')
            .attr('class', 'main axis')
            .attr('fill', 'white')
            .call(x1Axis);

        mini.append('g')
            .attr('transform', 'translate(0,' + miniHeight + ')')
            .attr('class', 'axis')
            .attr('fill', 'white')
            .call(xAxis);

        // draw the spans
        var itemRects = main.append('g')
            .attr('clip-path', 'url(#clip)');

        mini.append('g').selectAll('miniItems')
            .data(getPaths(spans))
            .enter().append('path')
            .attr('class', function (d) { return 'miniItem ' + d.class; })
            .attr('d', function (d) { return d.path; });

        // Create node for event circles
        let circles = main.append("g")

        // Create node for event lines
        let lines = main.append("svg")
            .attr("stroke-width", 2)

            .attr("stroke", "#ffd800")

        // invisible hit area to move around the selection window
        mini.append('rect')
            .attr('pointer-events', 'painted')
            .attr('width', width)
            .attr('height', miniHeight)
            .attr('visibility', 'hidden')
            .on('mouseup', moveBrush);

        // draw the selection area
        var brush = d3v3.svg.brush()
            .x(x)
            .extent([start, end])
            .on("brush", display);

        mini.append('g')
            .attr('class', 'x brush')
            .call(brush)
            .selectAll('rect')
            .attr('y', 1)
            .attr('height', miniHeight - 1);

        mini.selectAll('rect.background').remove();
        display();

        function display() {

            var rects, labels
                , minExtent = brush.extent()[0]
                , maxExtent = brush.extent()[1]
                , visItems = spans.filter(function (d) { return d.start < maxExtent && d.end > minExtent })
                , visEvents = events.filter(function (d) { return d.HRT <= maxExtent && d.HRT >= minExtent })
                , visLines = connectingLines.filter(function (d) {
                    return (d.origin.HRT <= maxExtent && d.origin.HRT >= minExtent) ||
                        (d.destination.HRT <= maxExtent && d.destination.HRT >= minExtent)
                });

            mini.select('.brush').call(brush.extent([minExtent, maxExtent]));

            x1.domain([minExtent, maxExtent]);

            // update the axis
            main.select('.main.axis').call(x1Axis);

            // upate the item rects
            rects = itemRects.selectAll('rect')
                .data(visItems, function (d) { return d.id; })
                .attr('x', function (d) { return x1(d.start); })
                .attr('width', function (d) { return x1(d.end) - x1(d.start); })
                .attr('stroke', 'red')

            rects.enter().append('rect')
                .attr('x', function (d) { return x1(d.start); })
                .attr('y', function (d) { return y1(d.y_id) + .1 * y1(1) + 0.5; })
                .attr('width', function (d) { return x1(d.end) - x1(d.start); })
                .attr('height', function (d) { return .8 * y1(1); })
                .attr('class', function (d) { return 'mainItem ' + d.class; })
                .attr('stroke', 'red')

            rects.exit().remove();

            // draw the event circles
            let circs = circles.selectAll(".circ")
                .data(visEvents)
                .attr("r", 0.1 * y1(1))
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("cx", function (d) { return x1(d.HRT) })
                .attr("cy", function (d) { return y1(threadToLaneMap.get(d.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("class", "circ")

            circs.enter().append("circle")
                .attr("r", 0.1 * y1(1))
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("cx", function (d) { return x1(d.HRT) })
                .attr("cy", function (d) { return y1(threadToLaneMap.get(d.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("class", "circ");

            circs.exit().remove();

            // draw the lines between parent and child events
            let lins = lines.selectAll(".lin")
                .data(visLines)
                .attr("width", 200)
                .attr("x1", function (d) { return x1(d.origin.HRT) })
                .attr("y1", function (d) { return y1(threadToLaneMap.get(d.origin.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("x2", function (d) { return x1(d.destination.HRT) })
                .attr("y2", function (d) { return y1(threadToLaneMap.get(d.destination.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("class", "lin");

            lins.enter().append("line")
                .attr("width", 200)
                .attr("x1", function (d) { return x1(d.origin.HRT) })
                .attr("y1", function (d) { return y1(threadToLaneMap.get(d.origin.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("x2", function (d) { return x1(d.destination.HRT) })
                .attr("y2", function (d) { return y1(threadToLaneMap.get(d.destination.ThreadID)) + .5 * y1(1) + 0.5; })
                .attr("class", "lin");

            lins.exit().remove();

        }

        function moveBrush() {
            var origin = d3v3.mouse(this)
                , point = x.invert(origin[0])
                , halfExtent = (brush.extent()[1] - brush.extent()[0]) / 2
                , start = point - halfExtent
                , end = point + halfExtent;

            brush.extent([start, end]);
            display();
        }

        // generates a single path for each item class in the mini display
        // ugly - but draws mini 2x faster than append lines or line generator
        // is there a better way to do a bunch of lines as a single path with d3v3?
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

    render() {
        return <div id={"#" + this.props.id}></div>
    }
}

export default SpanSwimlane