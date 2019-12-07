import React from "react";
import * as dc from "dc";
import { ChartTemplate } from "./chartTemplate";
import { SrcContext } from "./srcContext";
import { scaleSymlog } from "d3";

const lineChartFunc = (divRef, ndx) => {
    const lineChart = dc.rowChart(divRef);

    const remove_empty_bins = function(source_group) {
        return {
            all:function () {
                return source_group.all().filter(function(d) {
                    //return Math.abs(d.value) > 0.00001; // if using floating-point numbers
                    return d.value !== 0; // if integers only
                });
            }
        };
    }
    const dimension = ndx.dimension(function(d) {return d.Fname + ':' + d.Linenum;} );
    var links = {}
    var vals = dimension.top(Infinity)
    for (var i = 0; i < vals.length; i++) {
        var key = vals[i].Fname + ':' + vals[i].Linenum;
        links[key] = vals[i].Link;
    }
    const group = dimension.group().reduceSum(function(d) {return d.Count;})
    var filtered_group = remove_empty_bins(group);
    const xscale = scaleSymlog().domain([0, 100000]).range([0, 750])
    lineChart
    .width(750)
    .height(600)
    .dimension(dimension)
    .group(filtered_group)
    .x(xscale)
    .linearColors(["#ffd800"])
    .colorAccessor(function (d) { return 0; })
    .ordering(function(d) { return d.value;})

    lineChart.xAxis().tickValues([1, 10, 100, 1000, 10000, 100000, 1000000]).tickFormat(
        function (v) {
            return v;
        }
    );

    var oldClick = lineChart.onClick;
    lineChart.onClick = function(d) {
        window.location.href=links[d.key];
        return;
    };

    return lineChart;
}

export const LineChart = props => (
    <ChartTemplate chartFunction={lineChartFunc} context={React.useContext(SrcContext)} title="Distribution of Events across lines"  style={{visibility : 'hidden'}} id={"linechart"} />
)
