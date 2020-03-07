import React, { Component } from "react"
import * as d3v3 from "d3-v3"
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

function setSelectedSpan(spans, threadId, tasks) {
    var prevprevThreadID = 0;
    var prevThreadID = 0;
    spans.forEach(span => {
        if (span.class == "prevselected") {
            prevprevThreadID = span.id;
            console.log(span.class)
            span.class = "normal"
        }
        if (span.class == "selected") {
            console.log(span.class)
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
                let logDur = Math.log(task.Duration);
                if (logDur !== null && logDur >= min && logDur <= max) {
                    return "#E1341E" // Red
                } else {
                    return "#8EB200" // Green
                }
            })
        } else if (task.ThreadID === prevThreadID){
            task.bar.attr("fill", function (d) {
                let min = Math.min.apply(Math, d);
                let max = Math.max.apply(Math, d);
                let logDur = Math.log(task.Duration);
                if (logDur !== null && logDur >= min && logDur <= max) {
                    return "orange"
                } else {
                    return "#8EB200" // Green
                }
            })
        } else {
            task.bar.attr("fill", function (d) {
                let min = Math.min.apply(Math, d);
                let max = Math.max.apply(Math, d);
                let logDur = Math.log(task.Duration);
                if (logDur !== null && logDur >= min && logDur <= max) {
                    return "#1693A3" // Blue
                } else {
                    return "#8EB200" // Green
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
        let spans = createSpans(this.state.trace);
        let tasks = sortTasks(this.state.tasks, spans);
        this.state.tasks = tasks;
        let lanes = createLanes(this.state.trace);
        let spanMap = makeSpanMap(spans);
        let eventMap = makeEventMap(events);
        // Find the child span of each span and then use that to
        // find the critical path of a trace.
        setChildSpans(spanMap, eventMap);

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

        let paths = getPaths(spans)


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

        createHistograms();
        //createLegend(); //This legend suckssss

        function createHistograms() {
            // Define size of one histogram
            let histMargin = { top: 10, right: 10, bottom: 10, left: 10 }
            let histWidth = 100
            let histHeight = 100

            tasks.forEach(task => {
                let logData = task.Data.filter(d => d != 0).map(d => Math.log(d))
                logData = task.Data.filter(d => d !== 0).map(d => Math.log(d));

                let minDur = Math.min.apply(Math, logData)
                let maxDur = Math.max.apply(Math, logData)

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
                    .attr("class", "bleh")
                    .style("opacity", 0)
                    .style("fill", "white")
                    .on("mouseover", function () {
                        d3v3.selectAll("rect.bleh")
                            .style("opacity", 0)

                        d3v3.select(this)
                            .style("opacity", 0.1)

                        setSelectedSpan(spans, task.ThreadID, tasks)
                        let miniItems = mini.selectAll('miniItems').data(getPaths(spans))
                        miniItems.enter().append('path')
                            .attr('class', function (d) {
                                return "miniItem " + d.class
                            })
                            .attr('d', function (d) { return d.path; });
                        miniItems.exit().remove()
                    })


                // Create actual histogram
                let histX = d3v3.scale.linear()
                    .domain([minDur, maxDur])
                    .range([histMargin.left, histWidth - histMargin.right]);

                let data = d3v3.layout.histogram()
                    .bins(histX.ticks(15))(logData);

                let histYMax = d3v3.max(data, function (d) { return d.length });

                let histY = d3v3.scale.linear()
                    .domain([0, histYMax])
                    .range([histHeight, histMargin.bottom]);

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
                        let logDur = Math.log(task.Duration);
                        if (logDur !== null && logDur >= min && logDur <= max) {
                            return "#1ECBE1"
                        } else {
                            return "#8EB200" // Green
                        }
                    })
                    .style("align", "center")
                task.bar = rect
            })

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

        function createLegend() {
            var keys = ["Selected task", "Previous Selected Task"];
            var legend = d3v3.select("#legend").append("svg");
            var colors = ["#E1341E", "orange"]
            legend.selectAll("mydots").data(keys).enter()
                  .append("circle")
                        .attr("cx", function(d,i) { return 100})
                        .attr("cy", function(d,i){ return 100 + i * 25;})
                        .attr("r", 7)
                        .style("fill", function(d,i) {return colors[i];});

            legend.selectAll("mylabels")
                  .data(keys)
                  .enter()
                  .append("text")
                    .attr("x", function(d,i) {return 120} )
                    .attr("y", function(d,i) {return 100 + i * 25;})
                    .style("fill", "white")
                    .text(function(d){ return d})
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle") 
        }
    }

    render() {
        return <div id="container" >
            <div id="legend"></div>
            <div id="swimlane"> </div>
            <div id="hists"></div>
        </div>

    }
}

export default SpanSwimlane
