import React, { Component } from "react"
import * as d3 from "d3"
import { parseData, generateRandomWorkItems } from "./randomData"

class Swimlane extends Component {
    constructor(props) {
        super(props);
        this.createSwimlane = this.createSwimlane.bind(this);
    }

    componentDidMount() {
        this.createSwimlane();
    }

    compomenentDidUpdate() {
        this.createSwimlane();
    }

    createSwimlane() {
        let data = parseData(generateRandomWorkItems())
        let lanes = data.lanes
        let items = data.items
        let now = new Date()

        let margin = { top: 20, right: 15, bottom: 15, left: 60 }
            , width = 960 - margin.left - margin.right
            , height = 500 - margin.top - margin.bottom
            , miniHeight = lanes.length * 12 + 50
            , mainHeight = height - miniHeight - 50;

        let x = d3.scaleTime()
            .domain([d3.timeSunday(d3.min(items, function (d) { return d.start; })),
            d3.max(items, function (d) { return d.end; })])
            .range([0, width]);

        let x1 = d3.scaleTime().range([0, width]);
        let ext = d3.extent(lanes, function (d) { return d.id; });
        let y1 = d3.scaleLinear().domain([ext[0], ext[1] + 1]).range([0, mainHeight]);
        let y2 = d3.scaleLinear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

        let chart = d3.select('body')
            .append('svg:svg')
            .attr('width', width + margin.right + margin.left)
            .attr('height', height + margin.top + margin.bottom)
            .attr('class', 'chart');

        chart.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', width)
            .attr('height', mainHeight);

        let main = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr('width', width)
            .attr('height', mainHeight)
            .attr('class', 'main');

        let mini = chart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + (mainHeight + 60) + ')')
            .attr('width', width)
            .attr('height', miniHeight)
            .attr('class', 'mini');

        // draw the lanes for the main chart
        main.append('g').selectAll('.laneLines')
            .data(lanes)
            .enter().append('line')
            .attr('x1', 0)
            .attr('y1', function (d) { return d3.format(".1f")((y1(d.id)) + 0.5); })
            .attr('x2', width)
            .attr('y2', function (d) { return d3.format(".1f")((y1(d.id)) + 0.5); })
            .attr('stroke', function (d) { return d.label === '' ? 'white' : 'lightgray' });

        main.append('g').selectAll('.laneText')
            .data(lanes)
            .enter().append('text')
            .text(function (d) { return d.label; })
            .attr('x', -10)
            .attr('y', function (d) { return y1(d.id + .5); })
            .attr('dy', '0.5ex')
            .attr('text-anchor', 'end')
            .attr('class', 'laneText');

        // draw the lanes for the mini chart
        mini.append('g').selectAll('.laneLines')
            .data(lanes)
            .enter().append('line')
            .attr('x1', 0)
            .attr('y1', function (d) { return d3.format(".1f")((y2(d.id)) + 0.5); })
            .attr('x2', width)
            .attr('y2', function (d) { return d3.format(".1f")((y2(d.id)) + 0.5); })
            .attr('stroke', function (d) { return d.label === '' ? 'white' : 'lightgray' });

        mini.append('g').selectAll('.laneText')
            .data(lanes)
            .enter().append('text')
            .text(function (d) { return d.label; })
            .attr('x', -10)
            .attr('y', function (d) { return y2(d.id + .5); })
            .attr('dy', '0.5ex')
            .attr('text-anchor', 'end')
            .attr('class', 'laneText');

        // draw the x axis
        let xDateAxis = d3.axisBottom(x)
            .tickArguments(d3.timeMondays, (x.domain()[1] - x.domain()[0]) > 15552e6 ? 2 : 1)
            .tickFormat(d3.timeFormat('%d'))
            .tickSize(6);

        let x1DateAxis = d3.axisBottom(x1)
            .tickArguments(d3.timeDays, 1)
            .tickFormat(d3.timeFormat('%a %d'))
            .tickSize(6);

        let xMonthAxis = d3.axisTop(x)
            .tickArguments(d3.timeMonths, 1)
            .tickFormat(d3.timeFormat('%b %Y'))
            .tickSize(15);

        let x1MonthAxis = d3.axisTop(x1)
            .tickArguments(d3.timeMondays, 1)
            .tickFormat(d3.timeFormat('%b - Week %W'))
            .tickSize(15);

        main.append('g')
            .attr('transform', 'translate(0,' + mainHeight + ')')
            .attr('class', 'main axis date')
            .call(x1DateAxis);

        main.append('g')
            .attr('transform', 'translate(0,0.5)')
            .attr('class', 'main axis month')
            .call(x1MonthAxis)
            .selectAll('text')
            .attr('dx', 5)
            .attr('dy', 12);

        mini.append('g')
            .attr('transform', 'translate(0,' + miniHeight + ')')
            .attr('class', 'axis date')
            .call(xDateAxis);

        mini.append('g')
            .attr('transform', 'translate(0,0.5)')
            .attr('class', 'axis month')
            .call(xMonthAxis)
            .selectAll('text')
            .attr('dx', 5)
            .attr('dy', 12);

        // draw a line representing today's date
        main.append('line')
            .attr('y1', 0)
            .attr('y2', mainHeight)
            .attr('class', 'main todayLine')
            .attr('clip-path', 'url(#clip)');

        mini.append('line')
            .attr('x1', x(now) + 0.5)
            .attr('y1', 0)
            .attr('x2', x(now) + 0.5)
            .attr('y2', miniHeight)
            .attr('class', 'todayLine');

        // draw the items
        let itemRects = main.append('g')
            .attr('clip-path', 'url(#clip)');

        mini.append('g').selectAll('miniItems')
            .data(getPaths(items))
            .enter().append('path')
            .attr('class', function (d) { return 'miniItem ' + d.class; })
            .attr('d', function (d) { return d.path; });

        // invisible hit area to move around the selection window
        mini.append('rect')
            .attr('pointer-events', 'painted')
            .attr('width', width)
            .attr('height', miniHeight)
            .attr('visibility', 'hidden')
            .on('mouseup', moveBrush);

        // draw the selection area
        let brush = d3.brush()
            .extent([d3.timeMonday(now), d3.timeSaturday.ceil(now)])
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
            let rects, labels
            , minExtent = d3.timeDay(brush.extent()[0])
            , maxExtent = d3.timeDay(brush.extent()[1])
            , visItems = items.filter(function (d) { return d.start < maxExtent && d.end > minExtent});

            mini.select('.brush').call(brush.extent([minExtent, maxExtent]));

            x1.domain([minExtent, maxExtent]);

            if ((maxExtent - minExtent) > 1468800000) {
                x1DateAxis.tickArguments(d3.timeMondays, 1).tickFormat(d3.timeFormat('%a %d'))
                x1MonthAxis.tickArguments(d3.timeMondays, 1).tickFormat(d3.timeFormat('%b - Week %W'))
            }
            else if ((maxExtent - minExtent) > 172800000) {
                x1DateAxis.tickArguments(d3.timeDays, 1).tickFormat(d3.timeFormat('%a %d'))
                x1MonthAxis.tickArguments(d3.timeMondays, 1).tickFormat(d3.timeFormat('%b - Week %W'))
            }
            else {
                x1DateAxis.tickArguments(d3.timeHours, 4).tickFormat(d3.timeFormat('%I %p'))
                x1MonthAxis.tickArguments(d3.timeDays, 1).tickFormat(d3.timeFormat('%b %e'))
            }

            //x1Offset.range([0, x1(d3.time.day.ceil(now) - x1(d3.time.day.floor(now)))]);
            // shift the today line
            main.select('.main.todayLine')
                .attr('x1', x1(now) + 0.5)
                .attr('x2', x1(now) + 0.5);

            // update the axis
            main.select('.main.axis.date').call(x1DateAxis);

            main.select('.main.axis.month').call(x1MonthAxis)
                .selectAll('text')
                .attr('dx', 5)
                .attr('dy', 12);

            // upate the item rects
            rects = itemRects.selectAll('rect')
                .data(visItems, function (d) { return d.id; })
                .attr('x', function (d) { return x1(d.start); })
                .attr('width', function (d) { return x1(d.end) - x1(d.start); });

            rects.enter().append('rect')
                .attr('x', function (d) { return x1(d.start); })
                .attr('y', function (d) { return y1(d.lane) + .1 * y1(1) + 0.5; })
                .attr('width', function (d) { return x1(d.end) - x1(d.start); })
                .attr('height', function (d) { return .8 * y1(1); })
                .attr('class', function (d) { return 'mainItem ' + d.class; });
            rects.exit().remove();

            // update the item labels
            labels = itemRects.selectAll('text')
                .data(visItems, function (d) { return d.id; })
                .attr('x', function (d) { return x1(Math.max(d.start, minExtent)) + 2; });

            labels.enter().append('text')
                .text(function (d) { return 'Item\n\n\n\n Id: ' + d.id; })
                .attr('x', function (d) { return x1(Math.max(d.start, minExtent)) + 2; })
                .attr('y', function (d) { return y1(d.lane) + .4 * y1(1) + 0.5; })
                .attr('text-anchor', 'start')
                .attr('class', 'itemLabel');

            labels.exit().remove();
        }

        function moveBrush() {
            let origin = d3.mouse(this)
                , point = x.invert(origin[0])
                , halfExtent = (brush.extent().call()[1].getTime() - brush.extent().call()[0].getTime()) / 2
                , start = new Date(point.getTime() - halfExtent)
                , end = new Date(point.getTime() + halfExtent);

            brush.extent([start, end]);
            display();
        }

        // generates a single path for each item class in the mini display
        // ugly - but draws mini 2x faster than append lines or line generator
        // is there a better way to do a bunch of lines as a single path with d3?
        function getPaths(items) {
            let paths = {}, d, offset = .5 * y2(1) + 0.5, result = [];
            for (let i = 0; i < items.length; i++) {
                d = items[i];
                if (!paths[d.class]) paths[d.class] = '';
                paths[d.class] += ['M', x(d.start), (y2(d.lane) + offset), 'H', x(d.end)].join(' ');
            }
            for (let className in paths) {
                result.push({ class: className, path: paths[className] });
            }
            return result;
        }

    }

    render() {
        return <div id={"#" + this.props.id}></div>
    }
}

export default Swimlane